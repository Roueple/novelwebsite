// src/providers/auth-provider.tsx
"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { User, Provider } from '@supabase/supabase-js';
import { UserRole } from '@/types/supabase';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  loading: boolean;
  guestLoading: boolean;
  isAnonymous: boolean;
  signInWithProvider: (provider: Provider) => Promise<void>;
  signInWithEmail: (email: string) => Promise<void>;
  signInWithPhone: (phone: string) => Promise<void>;
  signInAnonymously: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [guestLoading, setGuestLoading] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);

  useEffect(() => {
    console.log("[AuthProvider] Initializing...");
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("[AuthProvider] Initial session:", session);
      const initialUser = session?.user ?? null;
      setUser(initialUser);
      // FIX: Provide default value for is_anonymous if undefined
      const initialAnonymity = initialUser?.is_anonymous ?? false;
      setIsAnonymous(initialAnonymity);
      if (initialUser) {
        fetchUserProfile(initialUser.id, initialAnonymity); // Pass initial anonymity
      } else {
         setRole(null);
      }
      setLoading(false);
      console.log("[AuthProvider] Initial load finished.");
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[AuthProvider] Auth state changed:", event, session);
      const currentUser = session?.user ?? null;
      const currentAnonymity = currentUser?.is_anonymous ?? false;

      setUser(currentUser);
      setIsAnonymous(currentAnonymity);

      if (currentUser) {
          await fetchUserProfile(currentUser.id, currentAnonymity); // Fetch profile on change

          // Linking is primarily handled by Supabase Auth session changes now.
          // The fetchUserProfile logic will update the is_guest flag in the profile
          // when a non-anonymous user is detected.

      } else {
        setRole(null);
        console.log("[AuthProvider] User signed out. Role cleared.");
      }
       if (loading) setLoading(false);
    });

    return () => {
        console.log("[AuthProvider] Unsubscribing from auth changes.");
        subscription.unsubscribe();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);


  async function fetchUserProfile(userId: string, isUserAnonymous: boolean) {
    console.log(`[AuthProvider] Fetching profile for user ID: ${userId}, IsAnonymous: ${isUserAnonymous}`);
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('role, is_guest')
            .eq('id', userId)
            .single();

        if (error && error.code === 'PGRST116') {
            console.log(`[AuthProvider] Profile not found for ${userId}. Creating profile.`);
            const username = `anon#${Math.floor(1000 + Math.random() * 900000)}`;
            const { error: insertError } = await supabase.from('profiles').insert({
                id: userId, username: username, role: 'reader', is_guest: isUserAnonymous
            });
            if (insertError) {
                console.error(`[AuthProvider] Failed to create profile for ${userId}:`, insertError);
                setRole(null);
            } else {
                console.log(`[AuthProvider] Profile created for ${userId}. Role: reader, IsGuest: ${isUserAnonymous}`);
                setRole('reader');
            }
            return;
        } else if (error) {
            console.error(`[AuthProvider] Error fetching profile for ${userId}:`, error);
            setRole(null);
            return;
        }

        const fetchedRole = data?.role ?? null;
        const fetchedIsGuest = data?.is_guest ?? false;
        setRole(fetchedRole);

        // Update profile if user is no longer anonymous but profile still says guest
        if (!isUserAnonymous && fetchedIsGuest) {
            console.log(`[AuthProvider] User ${userId} is no longer anonymous, updating profile is_guest flag.`);
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ is_guest: false })
                .eq('id', userId);
            if (updateError) {
                console.error(`[AuthProvider] Failed to update is_guest flag for ${userId}:`, updateError);
            } else {
                 console.log(`[AuthProvider] Profile is_guest flag updated for ${userId}.`);
            }
        }
        console.log(`[AuthProvider] Profile fetched for ${userId}:`, { role: fetchedRole, isGuest: fetchedIsGuest });

    } catch (error) {
         console.error(`[AuthProvider] Exception fetching/creating profile for ${userId}:`, error);
         setRole(null);
    }
  }

  // --- Sign-in Methods ---

  // Combined OAuth provider function (Handles linking or sign-in)
  async function signInWithProvider(provider: Provider) {
      if (user && isAnonymous) {
          console.log(`[AuthProvider] Linking ${provider} to anonymous user ${user.id}`);
          try {
              // Use linkIdentity for OAuth providers
              const { error } = await supabase.auth.linkIdentity({
                  provider: provider, // Provider type is correct here
                  options: { redirectTo: `${window.location.origin}/auth/callback` }
              });
              if (error) throw error;
              toast.info(`Redirecting to ${provider} to link account...`);
          } catch (error: any) {
              console.error(`Error linking ${provider}:`, error);
              toast.error(`Failed to link ${provider} account: ${error.message}`);
          }
      } else {
          console.log(`[AuthProvider] Signing in with ${provider}`);
          try {
              const { error } = await supabase.auth.signInWithOAuth({
                  provider: provider,
                  options: { redirectTo: `${window.location.origin}/auth/callback` }
              });
              if (error) throw error;
          } catch (error: any) {
              console.error(`Error signing in with ${provider}:`, error);
              toast.error(`Sign in with ${provider} failed: ${error.message}`);
          }
      }
  }

  // Kept signInWithGoogle for backward compatibility
  async function signInWithGoogle() {
      await signInWithProvider('google');
  }


  // FIX: Remove linkIdentity for email/phone. Use standard signInWithOtp.
  // Supabase handles replacing the anonymous session upon successful OTP verification.
  async function signInWithEmail(email: string) {
     console.log(`[AuthProvider] Signing in/verifying with email: ${email}`);
     try {
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: `${window.location.origin}/auth/callback`
                // Supabase handles session upgrade from anonymous automatically
            }
        });
        if (error) throw error;
        toast.info(`Verification link sent to ${email}. Check your inbox.`);
     } catch (error: any) {
         console.error("Email Sign in error:", error);
         toast.error(`Email sign in failed: ${error.message}`);
     }
  }

  async function signInWithPhone(phone: string) {
     console.log(`[AuthProvider] Signing in/verifying with phone: ${phone}`);
     try {
        const { error } = await supabase.auth.signInWithOtp({
            phone
            // Supabase handles session upgrade from anonymous automatically
            // Need UI for OTP entry after this call
        });
        if (error) throw error;
        toast.info(`OTP sent to ${phone}. Please enter it.`);
         // Implement UI for OTP entry here or in the calling component
     } catch (error: any) {
          console.error("Phone Sign in error:", error);
         toast.error(`Phone sign in failed: ${error.message}`);
     }
  }

  // Use signInAnonymously
  async function signInAnonymously() {
    if (user) { console.log("[AuthProvider] User already signed in."); return; }
    console.log("[AuthProvider] Attempting anonymous sign in...");
    setGuestLoading(true); setLoading(true);
    try {
        const { data: { user: anonUser }, error: anonError } = await supabase.auth.signInAnonymously();
        if (anonError) throw anonError;
        if (!anonUser) throw new Error("Anonymous sign in failed: No user object returned.");
        console.log("[AuthProvider] Anonymous user created/signed in:", anonUser.id);
        // Manually set state immediately - fetchUserProfile handles profile creation/check
        setUser(anonUser);
        setIsAnonymous(true);
        await fetchUserProfile(anonUser.id, true);
        console.log("[AuthProvider] Anonymous state set manually:", { user: anonUser.id, isAnonymous: true });
        toast.success("Commenting as Guest");
    } catch (error: any) {
        console.error("Error in signInAnonymously:", error);
        toast.error(error.message || "Failed to sign in as guest.");
        setUser(null); setRole(null); setIsAnonymous(false);
    } finally {
        setGuestLoading(false); setLoading(false);
        console.log("[AuthProvider] Anonymous sign in process finished.");
    }
  }


  async function signOut() {
    console.log("[AuthProvider] Signing out...");
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        console.log("[AuthProvider] Sign out successful.");
    } catch (error: any) {
         console.error("Sign out error:", error);
         toast.error(`Sign out failed: ${error.message}`);
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      role,
      loading,
      guestLoading,
      isAnonymous,
      signInWithProvider, // Use this for OAuth
      signInWithEmail,    // Use this for Email OTP
      signInWithPhone,    // Use this for Phone OTP
      signInAnonymously,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
