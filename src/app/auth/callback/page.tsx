// src/app/auth/callback/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
// import type { Profile } from '@/types'; // Not strictly needed here anymore
import LoadingSpinner from '@/components/ui/loading-spinner';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

const PENDING_COMMENT_STORAGE_KEY = 'pendingCommentData'; // Ensure this key matches

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<'loading' | 'processing_profile' | 'redirecting' | 'error' | 'idle_profile_exists'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const errorParam = searchParams.get('error');
    const errorDescriptionParam = searchParams.get('error_description');
    if (errorParam) {
      console.error(`[AuthCallback] Error from Supabase redirect: ${errorParam} - ${errorDescriptionParam}`);
      const decodedError = decodeURIComponent(errorDescriptionParam || errorParam) || "Authentication failed via email link.";
      setErrorMessage(decodedError);
      setStatus('error');
      toast.error(decodedError);
      // Don't remove PENDING_COMMENT_STORAGE_KEY on Supabase error, user might retry
      return;
    }

    const handleAuthCallback = async () => {
      console.log("[AuthCallback] Handling callback...");
      setStatus('loading');

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
        console.warn("[AuthCallback] No user session found after callback.");
        setErrorMessage("Authentication link may have expired or is invalid.");
        setStatus('error');
        toast.error("Authentication link invalid or expired.");
        return;
      }

      console.log("[AuthCallback] User authenticated:", newUser.id, "Email:", newUser.email);
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

      if (pendingData && pendingData.email === newUser.email) {
        console.log("[AuthCallback] Pending comment data found for this user:", pendingData);
        setStatus('processing_profile');
        toast.info("Finalizing your setup and posting comment...");

        try {
          // Call API route to complete profile and post comment
          // The API route uses the session from cookies to identify the user.
          const response = await fetch('/api/profiles/complete-signup-and-comment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              // Send all necessary data from localStorage
              userId: newUser.id, // Still useful for the API to double check if needed, though session is primary
              email: newUser.email, // Good to pass along
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
          localStorage.removeItem(PENDING_COMMENT_STORAGE_KEY); // Crucial: Clear data

          if (pendingData.novelId && pendingData.chapterId) {
            router.push(`/novels/${pendingData.novelId}/chapter/${pendingData.chapterId}`);
          } else {
            router.push('/');
          }
          return;

        } catch (apiError: any) {
          console.error("[AuthCallback] API error during profile/comment processing:", apiError);
          setErrorMessage(`Setup failed: ${apiError.message}. Your comment was not posted. Please try commenting again.`);
          setStatus('error');
          toast.error(`Setup failed: ${apiError.message}. Your comment was not posted.`);
          // Clear data on API error to prevent potential loops if user re-clicks link
          localStorage.removeItem(PENDING_COMMENT_STORAGE_KEY);
          return;
        }
      } else {
        console.log("[AuthCallback] No matching pending comment data found. Proceeding with normal login flow.");
        if (pendingDataString) { // If data existed but didn't match, clear it.
          localStorage.removeItem(PENDING_COMMENT_STORAGE_KEY);
        }
      }

      // Standard profile check for regular logins or if no pending comment data
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, display_name') // Only select necessary fields
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
        setStatus('redirecting');
        router.push('/profile/setup'); // Your username setup page
      }
    };

    handleAuthCallback();
  }, [router, searchParams]);


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

  return null;
}