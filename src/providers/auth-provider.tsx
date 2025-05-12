// src/providers/auth-provider.tsx
"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { User, Provider, Session } from '@supabase/supabase-js';
// This import MUST work for the rest of the code to be valid.
// If you still have errors on this line, the issue is with your types setup.
import type { Profile, UserRole } from '@/types';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  role: UserRole | null;
  loading: boolean; // True during initial Supabase session check AND initial profile load attempt
  profileLoading: boolean; // True ONLY when a profile fetch is actively in progress

  signInWithProvider: (provider: Provider) => Promise<void>;
  signInWithEmail: (email: string) => Promise<void>; // For OTP login/signup start
  signInWithPhone: (phone: string) => Promise<void>; // For OTP login/signup start
  // We'll add explicit email/password signup/login functions later when building UI for it
  signOut: () => Promise<void>;
  ensureProfileLoaded: () => Promise<void>; // To manually trigger a profile fetch if needed
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true); // Overall initial loading for auth session
  const [profileLoading, setProfileLoading] = useState(false); // Specifically for active profile fetch operations

  const activeUserProfileFetch = useRef<Promise<Profile | null> | null>(null);
  const userRef = useRef<User | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const clearAuthStates = useCallback(() => {
    console.log("[AuthProvider] clearAuthStates called");
    setUser(null);
    setProfile(null);
    setRole(null);
  }, []);

  const fetchUserProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    // Prevent redundant fetches if one for the same user is already in flight
    if (activeUserProfileFetch.current) {
      console.log(`[AuthProvider] fetchUserProfile: Active fetch ongoing for ${userId}. Awaiting existing promise.`);
      return activeUserProfileFetch.current;
    }

    console.log(`[AuthProvider] fetchUserProfile: Attempting for user ID: ${userId}`);
    setProfileLoading(true);

    const fetchPromise = (async (): Promise<Profile | null> => {
      try {
        const { data: fetchedProfileData, error: fetchError } = await supabase
          .from('profiles')
          .select('id, username, display_name, role, email') // Select new fields, no is_guest
          .eq('id', userId)
          .single();

        if (fetchError && fetchError.code === 'PGRST116') {
          console.warn(`[AuthProvider] Profile not found in public.profiles for user ${userId}. User needs to complete profile setup.`);
          setProfile(null);
          setRole(null);
          return null;
        } else if (fetchError) {
          console.error(`[AuthProvider] Error fetching profile for ${userId}:`, fetchError);
          toast.error(`Profile fetch error: ${fetchError.message}`);
          setProfile(null);
          setRole(null);
          return null;
        }

        const typedProfile = fetchedProfileData as Profile;
        console.log(`[AuthProvider] Profile successfully fetched for ${userId}:`, typedProfile);
        setProfile(typedProfile);
        setRole(typedProfile?.role || null); // Get role from profile
        return typedProfile;
      } catch (errCatch: any) {
        console.error(`[AuthProvider] Exception in fetchUserProfile for ${userId}:`, errCatch);
        toast.error(`Profile operation failed: ${errCatch.message || 'Unknown error'}`);
        setProfile(null);
        setRole(null);
        return null;
      } finally {
        setProfileLoading(false);
        activeUserProfileFetch.current = null; // Clear the ref once fetch is complete
      }
    })();

    activeUserProfileFetch.current = fetchPromise;
    return fetchPromise;
  }, []); // Empty dependency array: fetchUserProfile definition is stable

  useEffect(() => {
    setLoading(true); // For initial auth check
    let isMounted = true;
    console.log("[AuthProvider] Setting up initial session and auth state listener.");

    // Check initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      console.log("[AuthProvider] Initial getSession() result:", session);
      const initialUser = session?.user ?? null;
      setUser(initialUser); // Set user from session

      if (initialUser) {
        await fetchUserProfile(initialUser.id); // Fetch profile for the session user
      } else {
        clearAuthStates(); // No session user, ensure states are clear
      }
      if (isMounted) setLoading(false); // Initial auth check and potential profile load done
    }).catch(error => {
        if(!isMounted) return;
        console.error("[AuthProvider] Error in initial getSession():", error);
        clearAuthStates();
        if (isMounted) setLoading(false);
    });

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        console.log(`[AuthProvider] onAuthStateChange event: ${event}`, session);
        const currentUser = session?.user ?? null;
        const previousUser = userRef.current; // Get user before potential update

        setUser(currentUser); // Update user state immediately

        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          if (currentUser) {
            // Fetch profile if user changed or if profile was not loaded for the current user
            if (!profile || profile.id !== currentUser.id || previousUser?.id !== currentUser.id) {
              console.log(`[AuthProvider] Event ${event}: Triggering profile fetch for ${currentUser.id}`);
              await fetchUserProfile(currentUser.id);
            }
          } else {
            // Should not happen for SIGNED_IN if session is present, but handle defensively
            clearAuthStates();
          }
        } else if (event === 'SIGNED_OUT') {
          clearAuthStates();
        }
        // INITIAL_SESSION is handled by getSession() above.
        // TOKEN_REFRESHED typically doesn't require profile re-fetch unless user identity might change.
      }
    );

    return () => {
      isMounted = false;
      console.log("[AuthProvider] Cleaning up auth listener.");
      authListener.subscription.unsubscribe();
      activeUserProfileFetch.current = null; // Clear ref on unmount
    };
  }, [fetchUserProfile, clearAuthStates]); // Added profile to deps to re-evaluate if profile becomes null

  const ensureProfileLoaded = useCallback(async () => {
    const currentUser = userRef.current;
    if (currentUser && (!profile || profile.id !== currentUser.id) && !profileLoading && !activeUserProfileFetch.current) {
      console.log(`[AuthProvider] ensureProfileLoaded: Profile for ${currentUser.id} needed or different. Fetching.`);
      await fetchUserProfile(currentUser.id);
    } else if (profileLoading || activeUserProfileFetch.current) {
        console.log(`[AuthProvider] ensureProfileLoaded: Profile fetch already in progress for user ${currentUser?.id}.`);
    }
  }, [fetchUserProfile, profile, profileLoading]);

  async function signInWithProvider(provider: Provider) {
    console.log(`[AuthProvider] Attempting sign in with ${provider}`);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      // onAuthStateChange will handle the rest
    } catch (error: any) {
      toast.error(`Sign in with ${provider} failed: ${error.message}`);
      console.error(`Sign in with ${provider} error:`, error);
    }
  }

  async function signInWithEmail(email: string) { // For OTP
    console.log(`[AuthProvider] Sending OTP to ${email}`);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      toast.info(`Verification link sent to ${email}. Check your inbox.`);
    } catch (error: any) {
      toast.error(`Email OTP sign in failed: ${error.message}`);
      console.error(`Email OTP sign in error for ${email}:`, error);
    }
  }

  async function signInWithPhone(phone: string) { // For OTP
    console.log(`[AuthProvider] Sending OTP to ${phone}`);
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone });
      if (error) throw error;
      toast.info(`OTP sent to ${phone}.`);
    } catch (error: any) {
      toast.error(`Phone OTP sign in failed: ${error.message}`);
      console.error(`Phone OTP sign in error for ${phone}:`, error);
    }
  }

  async function signOut() {
    console.log("[AuthProvider] Signing out.");
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      // clearAuthStates() is called by onAuthStateChange for 'SIGNED_OUT'
      toast.success("Signed out successfully.");
    } catch (error: any) {
      toast.error(`Sign out failed: ${error.message}`);
      console.error("Sign out error:", error);
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      role,
      loading,
      profileLoading,
      signInWithProvider,
      signInWithEmail,
      signInWithPhone,
      signOut,
      ensureProfileLoaded
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