// src/app/auth/callback/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import UsernameSetup from '@/components/username-setup';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button'; // <<< FIX: Added Button import

export default function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'setup_username' | 'redirecting' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function handleAuthCallback() {
      console.log("[AuthCallback] Handling callback...");
      setStatus('loading');
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for session update

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
        router.push('/');
        return;
      }

      console.log("[AuthCallback] User authenticated:", newUser.id, "Is Anonymous:", newUser.is_anonymous);

      // --- Profile Check Logic ---
      console.log("[AuthCallback] Checking profile for user:", newUser.id);
      try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('username, is_guest')
            .eq('id', newUser.id)
            .maybeSingle();

          if (profileError && profileError.code !== 'PGRST116') {
            throw profileError;
          }

          // Redirect home if profile exists AND (has a username OR is no longer a guest)
          if (profile && (profile.username || profile.is_guest === false)) {
            console.log("[AuthCallback] User profile found/updated. Redirecting home.");
            setStatus('redirecting');
            router.push('/');
          } else {
            console.log("[AuthCallback] User needs username setup or profile is pending.");
            setStatus('setup_username');
          }
      } catch(profileCheckError: any) {
           console.error("[AuthCallback] Error checking profile:", profileCheckError);
           setErrorMessage("Failed to check user profile after login.");
           setStatus('error');
      }
    }

    handleAuthCallback();
  }, [router]);

  if (status === 'setup_username') {
    return <UsernameSetup />;
  }

  if (status === 'error') {
      return (
          <div className="min-h-screen flex items-center justify-center text-center p-4 bg-background">
              <div>
                  <h1 className="text-xl text-destructive mb-4">Authentication Error</h1>
                  <p className="text-muted-foreground mb-6">{errorMessage || "An unexpected error occurred."}</p>
                  {/* Button component is now imported */}
                  <Button onClick={() => router.push('/')}>Go to Home</Button>
              </div>
          </div>
      )
  }

  const loadingMessage = status === 'redirecting' ? "Redirecting..." : "Verifying authentication...";
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <LoadingSpinner size="lg" className="mx-auto mb-4 text-primary" />
        <p className="text-muted-foreground">{loadingMessage}</p>
      </div>
    </div>
  );
}
