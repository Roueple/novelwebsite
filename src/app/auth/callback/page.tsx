// src/app/auth/callback/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation'; // Added useSearchParams
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

const PENDING_COMMENT_STORAGE_KEY = 'pendingCommentData'; // Same key as in ChapterComments

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams(); // To potentially read error messages from URL

  const [status, setStatus] = useState<'loading' | 'processing_profile' | 'redirecting' | 'error' | 'idle_profile_exists'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Check for Supabase auth errors in URL (e.g., if magic link expired)
    const errorParam = searchParams.get('error');
    const errorDescriptionParam = searchParams.get('error_description');
    if (errorParam) {
      console.error(`[AuthCallback] Error from Supabase redirect: ${errorParam} - ${errorDescriptionParam}`);
      setErrorMessage(errorDescriptionParam || decodeURIComponent(errorParam) || "Authentication failed via email link.");
      setStatus('error');
      toast.error(errorMessage || "Failed to authenticate via email link.");
      // No localStorage.removeItem(PENDING_COMMENT_STORAGE_KEY) here as the process failed before completion
      return;
    }

    const handleAuthCallback = async () => {
      console.log("[AuthCallback] Handling callback...");
      setStatus('loading');

      // Supabase client handles session automatically on redirect from magic link.
      // We just need to get the user.
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error("[AuthCallback] Error getting session:", sessionError);
        setErrorMessage("Failed to verify authentication session.");
        setStatus('error');
        toast.error("Session verification failed.");
        return;
      }

      const newUser = session?.user;

      if (!newUser) {
        console.warn("[AuthCallback] No user session found after callback. This might be an expired link or an issue.");
        setErrorMessage("Authentication link may have expired or is invalid.");
        setStatus('error');
        toast.error("Authentication link invalid or expired.");
        return;
      }

      console.log("[AuthCallback] User authenticated:", newUser.id, "Email:", newUser.email);

      // Check for pending comment data from localStorage
      const pendingDataString = localStorage.getItem(PENDING_COMMENT_STORAGE_KEY);
      let pendingData = null;
      if (pendingDataString) {
        try {
          pendingData = JSON.parse(pendingDataString);
        } catch (e) {
          console.error("Error parsing pending comment data from localStorage:", e);
          localStorage.removeItem(PENDING_COMMENT_STORAGE_KEY); // Clear corrupted data
        }
      }

      // Only proceed with custom comment flow if pending data exists AND matches the current user's email
      if (pendingData && pendingData.email === newUser.email) {
        console.log("[AuthCallback] Pending comment data found for this user:", pendingData);
        setStatus('processing_profile');
        toast.info("Finalizing your setup and posting comment...");

        try {
          // Call API route to complete profile and post comment
          const response = await fetch('/api/profiles/complete-signup-and-comment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // The API route will get the user from its own Supabase client instance using cookies
            body: JSON.stringify({
              userId: newUser.id, // Send user ID for verification/association
              email: newUser.email, // Send email for profile creation
              displayName: pendingData.displayName,
              commentText: pendingData.text,
              chapterId: pendingData.chapterId,
              novelId: pendingData.novelId,
            }),
          });

          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.error || 'Failed to complete setup or post comment.');
          }

          toast.success(result.message || "Setup complete and comment submitted!");
          localStorage.removeItem(PENDING_COMMENT_STORAGE_KEY); // Crucial: Clear data after successful processing

          // Redirect to the chapter page
          if (pendingData.novelId && pendingData.chapterId) {
            router.push(`/novels/${pendingData.novelId}/chapter/${pendingData.chapterId}`);
          } else {
            router.push('/'); // Fallback redirect
          }
          // No need to router.refresh() here as AuthProvider should re-fetch profile on user change
          // and chapter page will fetch comments.
          return; // Exit early after handling comment flow

        } catch (apiError: any) {
          console.error("[AuthCallback] API error during profile/comment processing:", apiError);
          setErrorMessage(`Setup failed: ${apiError.message}. Your comment was not posted. Please try commenting again.`);
          setStatus('error');
          toast.error(`Setup failed: ${apiError.message}. Your comment was not posted.`);
          // Don't remove from localStorage on API error, so user doesn't lose comment text if they want to retry later
          // However, this could lead to repeated attempts if the error is persistent.
          // For now, let's clear it to avoid loops if user re-clicks magic link. Consider UX.
          localStorage.removeItem(PENDING_COMMENT_STORAGE_KEY);
          return;
        }
      } else {
         // No pending comment data, or email mismatch (could be regular login)
        console.log("[AuthCallback] No matching pending comment data found. Checking profile normally.");
        if (pendingDataString) { // If data existed but didn't match, clear it.
            localStorage.removeItem(PENDING_COMMENT_STORAGE_KEY);
        }
      }

      // Standard profile check (if not handled by the API above or if no pending data)
      // This part is similar to your existing callback, checking if profile exists and redirecting
      // to username setup if needed, or home if profile is complete.
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, display_name')
        .eq('id', newUser.id)
        .maybeSingle();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error("[AuthCallback] Error fetching existing profile:", profileError);
        setErrorMessage("Failed to check your profile information.");
        setStatus('error');
        return;
      }

      if (userProfile && userProfile.username && userProfile.display_name) {
        console.log("[AuthCallback] Existing complete profile found. Redirecting home.");
        setStatus('redirecting');
        router.push('/');
      } else {
        console.log("[AuthCallback] Profile incomplete or missing. Redirecting to username setup.");
        // If `display_name` was set by OAuth, UsernameSetup should pick it up.
        // If from OTP and no pending comment, UsernameSetup will ask for display_name and generate username.
        setStatus('redirecting'); // Or a specific status for setup
        router.push('/profile/setup'); // Your existing username setup page
      }
    };

    handleAuthCallback();
  }, [router, searchParams]); // searchParams added as dependency

  let loadingMessage = "Verifying your authentication...";
  if (status === 'processing_profile') loadingMessage = "Finalizing your account and posting comment...";
  if (status === 'redirecting') loadingMessage = "Redirecting...";
  if (status === 'idle_profile_exists') loadingMessage = "Welcome back! Redirecting...";


  if (status === 'loading' || status === 'processing_profile' || status === 'redirecting' || status === 'idle_profile_exists') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">{loadingMessage}</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center text-center p-4 bg-background">
        <div>
          <h1 className="text-xl text-destructive mb-4">Authentication Problem</h1>
          <p className="text-muted-foreground mb-6">{errorMessage || "An unexpected error occurred."}</p>
          <Button onClick={() => router.push('/')}>Go to Home</Button>
        </div>
      </div>
    );
  }

  return null; // Should be covered by other states
}