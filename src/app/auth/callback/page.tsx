// src/app/auth/callback/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import UsernameSetup from '@/components/username-setup';

export default function AuthCallback() {
  const router = useRouter();
  const [needsUsername, setNeedsUsername] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/');
        return;
      }

      // Check if user has a profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      if (profile) {
        // User has a profile, redirect to home
        router.push('/');
      } else {
        // User needs to set up username
        setNeedsUsername(true);
      }
    }

    checkUser();
  }, [router]);

  if (needsUsername) {
    return <UsernameSetup />;
  }

  // Loading state
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Setting up your account...</p>
      </div>
    </div>
  );
}