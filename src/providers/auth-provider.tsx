// src/providers/auth-provider.tsx
"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { User as SupabaseUser, Session as SupabaseSession, Provider } from '@supabase/supabase-js';
import type { Profile as AppProfile, UserRole as AppUserRole } from '@/types'; // Your central app types
import { toast } from 'sonner';

// Define the context type correctly
interface AuthContextType {
  user: SupabaseUser | null;
  profile: AppProfile | null;
  role: AppUserRole | null;
  loading: boolean; // True during initial Supabase session check AND initial profile load attempt
  profileLoading: boolean; // True ONLY when a profile fetch is actively in progress

  signInWithProvider: (provider: Provider) => Promise<void>;
  signInWithEmail: (email: string) => Promise<void>; // This is your OTP initiator
  verifyEmailOtp: (email: string, token: string) => Promise<{ user: SupabaseUser | null, session: SupabaseSession | null, error: Error | null }>; // Corrected signature
  signOut: () => Promise<void>;
  ensureProfileLoaded: () => Promise<void>;
  // Add signInWithPassword if you implemented it for guests later
  // signInWithPassword?: (emailIn: string, passwordIn: string) => Promise<SupabaseSession | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [role, setRole] = useState<AppUserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const activeUserProfileFetch = useRef<Promise<AppProfile | null> | null>(null);
  const userRef = useRef<SupabaseUser | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const clearAuthStates = useCallback(() => {
    console.log("[AuthProvider] clearAuthStates called");
    setUser(null);
    setProfile(null);
    setRole(null);
  }, []);

  const fetchUserProfile = useCallback(async (userId: string): Promise<AppProfile | null> => {
    if (activeUserProfileFetch.current) {
      console.log(`[AuthProvider] fetchUserProfile: Active fetch ongoing for ${userId}. Awaiting existing promise.`);
      return activeUserProfileFetch.current;
    }
    console.log(`[AuthProvider] fetchUserProfile: Attempting for user ID: ${userId}`);
    setProfileLoading(true);

    const fetchPromise = (async (): Promise<AppProfile | null> => {
      try {
        const { data: fetchedProfileData, error: fetchError } = await supabase
          .from('profiles')
          // Ensure you select all fields needed for your AppProfile type, including new ones
          .select('id, username, display_name, role, email, comment_count, experience_points, level, chapters_read_count, created_at, updated_at, active_title, profile_cosmetics, vip_tier')
          .eq('id', userId)
          .single();

        if (fetchError && fetchError.code === 'PGRST116') {
          console.warn(`[AuthProvider] Profile not found for user ${userId}.`);
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
        const typedProfile = fetchedProfileData as AppProfile;
        console.log(`[AuthProvider] Profile successfully fetched for ${userId}:`, typedProfile);
        setProfile(typedProfile);
        setRole(typedProfile?.role || null);
        return typedProfile;
      } catch (errCatch: any) {
        console.error(`[AuthProvider] Exception in fetchUserProfile for ${userId}:`, errCatch);
        toast.error(`Profile operation failed: ${errCatch.message || 'Unknown error'}`);
        setProfile(null);
        setRole(null);
        return null;
      } finally {
        setProfileLoading(false);
        activeUserProfileFetch.current = null;
      }
    })();
    activeUserProfileFetch.current = fetchPromise;
    return fetchPromise;
  }, []);

  useEffect(() => {
    setLoading(true);
    let isMounted = true;
    console.log("[AuthProvider] Setting up initial session and auth state listener.");

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      console.log("[AuthProvider] Initial getSession() result:", session);
      const initialUser = session?.user ?? null;
      setUser(initialUser);
      if (initialUser) {
        await fetchUserProfile(initialUser.id);
      } else {
        clearAuthStates();
      }
      if (isMounted) setLoading(false);
    }).catch(error => {
        if(!isMounted) return;
        console.error("[AuthProvider] Error in initial getSession():", error);
        clearAuthStates();
        if (isMounted) setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        console.log(`[AuthProvider] onAuthStateChange event: ${event}`, session);
        const currentUser = session?.user ?? null;
        const previousUser = userRef.current;

        setUser(currentUser);

        if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION') {
          if (currentUser) {
            if (!profile || profile.id !== currentUser.id || previousUser?.id !== currentUser.id) {
              console.log(`[AuthProvider] Event ${event}: Triggering profile fetch for ${currentUser.id}`);
              await fetchUserProfile(currentUser.id);
            }
          } else {
            clearAuthStates();
          }
        } else if (event === 'SIGNED_OUT') {
          clearAuthStates();
        }
      }
    );
    return () => {
      isMounted = false;
      console.log("[AuthProvider] Cleaning up auth listener.");
      authListener.subscription.unsubscribe();
      activeUserProfileFetch.current = null;
    };
  }, [fetchUserProfile, clearAuthStates, profile]); // profile added to dependencies

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
    } catch (error: any) {
      toast.error(`Sign in with ${provider} failed: ${error.message}`);
      console.error(`Sign in with ${provider} error:`, error);
    }
  }

  async function signInWithEmail(email: string) { // This is your OTP initiator
    console.log(`[AuthProvider] Sending OTP to ${email}`);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      // Toast for OTP sent will be handled by the calling component (ChapterComments)
    } catch (error: any) {
      console.error(`Email OTP initiation error for ${email}:`, error);
      throw error; // Re-throw so calling component knows and can toast
    }
  }

  async function verifyEmailOtp(email: string, token: string): Promise<{ user: SupabaseUser | null, session: SupabaseSession | null, error: Error | null }> {
    console.log(`[AuthProvider] Verifying OTP ${token} for ${email}`);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'signup', // Or 'email'. 'signup' is good if shouldCreateUser was true.
      });
      if (error) throw error;
      // onAuthStateChange will handle setting user, profile state.
      // A success toast here is good.
      toast.success("Email verified successfully! You are now logged in.");
      return { user: data.user, session: data.session, error: null };
    } catch (error: any) {
      // Toast for failure handled by calling component if needed, or here.
      toast.error(`OTP verification failed: ${error.message}`);
      console.error(`OTP verification error for ${email}:`, error);
      return { user: null, session: null, error: error as Error };
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

  // Add signInWithPassword if you intend to use it for other flows
  // async function signInWithPassword(emailIn: string, passwordIn: string): Promise<SupabaseSession | null> { ... }

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      role,
      loading,
      profileLoading,
      signInWithProvider,
      signInWithEmail,
      verifyEmailOtp, // Make sure this is included
      signOut,
      ensureProfileLoaded,
      // signInWithPassword, // Add if implemented
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