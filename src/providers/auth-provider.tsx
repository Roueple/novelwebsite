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
  signInAnonymously: () => Promise<boolean>; // Changed return type to indicate success/failure
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
      const initialAnonymity = initialUser?.is_anonymous ?? false;
      setIsAnonymous(initialAnonymity);
      if (initialUser) {
        fetchUserProfile(initialUser.id, initialAnonymity);
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

      // Only update state if user or anonymity actually changed
      let userChanged = currentUser?.id !== user?.id;
      let anonymityChanged = currentAnonymity !== isAnonymous;

      if (userChanged) setUser(currentUser);
      if (anonymityChanged) setIsAnonymous(currentAnonymity);

      if (currentUser) {
          // Fetch profile if user exists or anonymity changed
          if (userChanged || anonymityChanged) {
             await fetchUserProfile(currentUser.id, currentAnonymity);
          }
          // Linking is handled by Supabase session changes + profile update in fetchUserProfile
      } else {
        // Clear role only if user is actually null now
        if (user !== null) setRole(null);
        console.log("[AuthProvider] User signed out. Role cleared.");
      }
       if (loading) setLoading(false);
    });

    return () => {
        console.log("[AuthProvider] Unsubscribing from auth changes.");
        subscription.unsubscribe();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, isAnonymous]); // Added user/isAnonymous to deps for more precise updates


  async function fetchUserProfile(userId: string, isUserAnonymous: boolean): Promise<UserRole | null> { // Return role
    console.log(`[AuthProvider] Fetching profile for user ID: ${userId}, IsAnonymous: ${isUserAnonymous}`);
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('role, is_guest')
            .eq('id', userId)
            .single();

        if (error && error.code === 'PGRST116') {
            console.log(`[AuthProvider] Profile not found for ${userId}.`);
             // If profile doesn't exist AND user is anonymous, create it now.
             if (isUserAnonymous) {
                 console.log(`[AuthProvider] Creating profile for anonymous user ${userId}.`);
                 const username = `anon#${Math.floor(1000 + Math.random() * 900000)}`;
                 const { error: insertError } = await supabase.from('profiles').insert({
                     id: userId, username: username, role: 'reader', is_guest: true
                 });
                 if (insertError) {
                     console.error(`[AuthProvider] Failed to create profile for ${userId}:`, insertError);
                     setRole(null); // Set role to null on creation failure
                     return null;
                 } else {
                     console.log(`[AuthProvider] Profile created for ${userId}. Role: reader, IsGuest: true`);
                     setRole('reader'); // Set role after successful creation
                     return 'reader';
                 }
             } else {
                 // Profile not found for a non-anonymous user (shouldn't usually happen after login)
                 console.warn(`[AuthProvider] Profile not found for non-anonymous user ${userId}.`);
                 setRole(null);
                 return null;
             }
        } else if (error) {
            console.error(`[AuthProvider] Error fetching profile for ${userId}:`, error);
            setRole(null);
            return null;
        }

        // Profile exists
        const fetchedRole = data?.role ?? null;
        const fetchedIsGuest = data?.is_guest ?? false;
        setRole(fetchedRole); // Update role state

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
        return fetchedRole; // Return the fetched/set role

    } catch (error) {
         console.error(`[AuthProvider] Exception fetching/creating profile for ${userId}:`, error);
         setRole(null);
         return null;
    }
  }

  // --- Sign-in Methods ---

  async function signInWithProvider(provider: Provider) {
      // ... (implementation remains the same)
      if (user && isAnonymous) {
          console.log(`[AuthProvider] Linking ${provider} to anonymous user ${user.id}`);
          try {
              const { error } = await supabase.auth.linkIdentity({ provider: provider, options: { redirectTo: `${window.location.origin}/auth/callback` } });
              if (error) throw error;
              toast.info(`Redirecting to ${provider} to link account...`);
          } catch (error: any) {
              console.error(`Error linking ${provider}:`, error);
              toast.error(`Failed to link ${provider} account: ${error.message}`);
          }
      } else {
          console.log(`[AuthProvider] Signing in with ${provider}`);
          try {
              const { error } = await supabase.auth.signInWithOAuth({ provider: provider, options: { redirectTo: `${window.location.origin}/auth/callback` } });
              if (error) throw error;
          } catch (error: any) {
              console.error(`Error signing in with ${provider}:`, error);
              toast.error(`Sign in with ${provider} failed: ${error.message}`);
          }
      }
  }

  async function signInWithGoogle() {
      await signInWithProvider('google');
  }

  async function signInWithEmail(email: string) {
     console.log(`[AuthProvider] Signing in/verifying with email: ${email}`);
     try {
        const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } });
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
        const { error } = await supabase.auth.signInWithOtp({ phone });
        if (error) throw error;
        toast.info(`OTP sent to ${phone}. Please enter it.`);
     } catch (error: any) {
          console.error("Phone Sign in error:", error);
         toast.error(`Phone sign in failed: ${error.message}`);
     }
  }

  // FIX: Await profile creation/check within signInAnonymously
  async function signInAnonymously(): Promise<boolean> { // Return boolean success
    if (user) {
        console.log("[AuthProvider] User already signed in.");
        return true; // Already signed in (might be anon or registered)
    }
    console.log("[AuthProvider] Attempting anonymous sign in...");
    setGuestLoading(true); setLoading(true); // Indicate loading
    try {
        const { data: { user: anonUser }, error: anonError } = await supabase.auth.signInAnonymously();

        if (anonError) throw anonError;
        if (!anonUser) throw new Error("Anonymous sign in failed: No user object returned.");

        console.log("[AuthProvider] Anonymous user created/signed in:", anonUser.id);

        // Explicitly fetch/create profile *now* and wait for it
        const profileRole = await fetchUserProfile(anonUser.id, true); // Pass true for isAnonymous

        // Update local state *after* profile check/creation attempt
        setUser(anonUser);
        setIsAnonymous(true);
        setRole(profileRole); // Set role based on fetchUserProfile result

        console.log("[AuthProvider] Anonymous state set:", { user: anonUser.id, isAnonymous: true, role: profileRole });
        toast.success("Commenting as Guest");
        return true; // Indicate success

    } catch (error: any) {
        console.error("Error in signInAnonymously:", error);
        toast.error(error.message || "Failed to sign in as guest.");
        setUser(null); setRole(null); setIsAnonymous(false); // Reset state on failure
        return false; // Indicate failure
    } finally {
        setGuestLoading(false); setLoading(false); // Stop loading indicators
        console.log("[AuthProvider] Anonymous sign in process finished.");
    }
  }


  async function signOut() {
    // ... (implementation remains the same)
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
      signInWithProvider,
      signInWithEmail,
      signInWithPhone,
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
