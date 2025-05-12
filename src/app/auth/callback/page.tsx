// src/app/auth/callback/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase'; // Your Supabase client
import type { Profile } from '@/types'; // Import your updated Profile type from @/types
import UsernameSetup from '@/components/username-setup';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export default function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'setup_username' | 'redirecting' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function handleAuthCallback() {
      console.log("[AuthCallback] Handling callback...");
      setStatus('loading');
      // Brief pause can sometimes help ensure session is fully processed by Supabase client
      await new Promise(resolve => setTimeout(resolve, 200));

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("[AuthCallback] Error getting session:", sessionError);
        setErrorMessage("Failed to verify authentication session.");
        setStatus('error');
        return;
      }

      const newUser = session?.user;

      if (!newUser) {
        console.warn("[AuthCallback] No user session found after callback. Redirecting home.");
        toast.error("Authentication failed or session expired.");
        // No need to setStatus to 'redirecting' here, just push
        router.push('/');
        return;
      }

      console.log("[AuthCallback] User authenticated:", newUser.id);

      // --- Profile Check Logic ---
      console.log("[AuthCallback] Checking profile for user:", newUser.id);
      try {
        // Select the fields needed to determine if profile setup is complete
        // username (unique handle) and display_name are key.
        const { data: fetchedProfileData, error: profileFetchError } = await supabase
          .from('profiles')
          .select('id, username, display_name, role, email') // Select current fields
          .eq('id', newUser.id)
          .maybeSingle(); // Use maybeSingle as profile might not exist yet

        if (profileFetchError && profileFetchError.code !== 'PGRST116') { // PGRST116 means 0 rows found, which is fine
          // An actual error occurred fetching the profile (not just "not found")
          console.error("[AuthCallback] Error fetching profile:", profileFetchError);
          throw profileFetchError;
        }

        const userProfile = fetchedProfileData as Profile | null;

        // Redirect home if profile exists AND has essential fields like username and display_name.
        // (is_guest is removed from this logic)
        if (userProfile && userProfile.username && userProfile.display_name) {
          console.log("[AuthCallback] User profile found and appears complete (username/display_name exist). Redirecting home.");
          setStatus('redirecting');
          router.push('/');
        } else {
          // Profile doesn't exist, or is missing username/display_name.
          // User needs to go through profile setup (which UsernameSetup.tsx handles).
          console.log("[AuthCallback] User profile missing or incomplete. Needs setup.");
          setStatus('setup_username');
        }
      } catch (profileCheckOrFetchError: any) {
        console.error("[AuthCallback] Error during profile check/fetch:", profileCheckOrFetchError);
        setErrorMessage(`Failed to process user profile after login: ${profileCheckOrFetchError.message || 'Please try again.'}`);
        setStatus('error');
      }
    }

    handleAuthCallback();
  }, [router]); // router is a stable dependency

  if (status === 'setup_username') {
    return <UsernameSetup />; // This component will handle creating/updating the profile
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center text-center p-4 bg-background">
        <div>
          <h1 className="text-xl text-destructive mb-4">Authentication Process Error</h1>
          <p className="text-muted-foreground mb-6">{errorMessage || "An unexpected error occurred during login/signup."}</p>
          <Button onClick={() => router.push('/')}>Go to Home</Button>
        </div>
      </div>
    );
  }

  // Covers 'loading' and 'redirecting' states
  const loadingMessage = status === 'redirecting' ? "Finalizing login, redirecting..." : "Verifying authentication...";
  return (
    <div className="min_h_screen flex items-center justify-center bg-background">
      <div className="text-center">
        <LoadingSpinner size="lg" className="mx_auto mb_4 text_primary" />
        <p className="text_muted_foreground">{loadingMessage}</p>
      </div>
    </div>
  );
}