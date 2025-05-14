// src/providers/auth-provider.tsx
"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { User as SupabaseUser, Session as SupabaseSession, Provider } from '@supabase/supabase-js';
import type { Profile, UserRole as AppUserRole } from '@/types'; // Use Profile directly
import { toast } from 'sonner';

interface AuthContextType {
  user: SupabaseUser | null;
  profile: Profile | null;
  role: AppUserRole | null;
  loading: boolean; 
  profileLoading: boolean; 
  signInWithProvider: (provider: Provider) => Promise<void>;
  signInWithEmail: (email: string) => Promise<void>; // Email OTP initiator
  verifyEmailOtp: (email: string, token: string) => Promise<{ user: SupabaseUser | null, session: SupabaseSession | null, error: Error | null }>;
  signInWithPhone: (phone: string) => Promise<void>; // Phone OTP initiator
  verifyPhoneOtp: (phone: string, token: string) => Promise<{ user: SupabaseUser | null, session: SupabaseSession | null, error: Error | null }>; // Phone OTP verifier
  signOut: () => Promise<void>;
  ensureProfileLoaded: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userState, setUserState] = useState<SupabaseUser | null>(null);
  const [profileState, setProfileState] = useState<Profile | null>(null);
  const [roleState, setRoleState] = useState<AppUserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const userRef = useRef<SupabaseUser | null>(userState);
  const profileRef = useRef<Profile | null>(profileState);
  const activeUserProfileFetch = useRef<Promise<Profile | null> | null>(null);

  useEffect(() => {
    userRef.current = userState;
  }, [userState]);

  useEffect(() => {
    profileRef.current = profileState;
  }, [profileState]);

  const clearAuthStates = useCallback(() => {
    console.log("[AuthProvider] clearAuthStates called");
    userRef.current = null;
    profileRef.current = null;
    setUserState(null);
    setProfileState(null);
    setRoleState(null);
  }, []);

  const fetchUserProfile = useCallback(async (userId: string, forceRefetch = false): Promise<Profile | null> => {
    if (!userId) {
        console.warn("[AuthProvider] fetchUserProfile called with no userId.");
        clearAuthStates();
        return null;
    }
    if (!forceRefetch && profileRef.current && profileRef.current.id === userId) {
      console.log(`[AuthProvider] fetchUserProfile: Profile for ${userId} already loaded in ref. Not refetching unless forced.`);
      if (profileState?.id !== userId) setProfileState(profileRef.current); // Sync state if needed
      if (roleState !== profileRef.current.role) setRoleState(profileRef.current.role || null); // Sync state if needed
      return profileRef.current;
    }
    if (activeUserProfileFetch.current && !forceRefetch) {
      console.log(`[AuthProvider] fetchUserProfile: Active fetch for ${userId} already ongoing.`);
      return activeUserProfileFetch.current;
    }
    
    console.log(`[AuthProvider] fetchUserProfile: Attempting for user ID: ${userId}. Force refetch: ${forceRefetch}`);
    setProfileLoading(true);
    const fetchPromise = (async (): Promise<Profile | null> => {
      try {
        const { data: fetchedProfileData, error: fetchError } = await supabase
          .from('profiles')
          .select('id, username, display_name, role, email, comment_count, experience_points, level, chapters_read_count, created_at, updated_at, active_title, profile_cosmetics, vip_tier')
          .eq('id', userId)
          .single();

        if (fetchError && fetchError.code === 'PGRST116') {
          console.warn(`[AuthProvider] Profile not found in DB for user ${userId}.`);
          setProfileState(null); profileRef.current = null;
          setRoleState(null);
          return null;
        } else if (fetchError) {
          console.error(`[AuthProvider] Error fetching profile for ${userId}:`, fetchError);
          toast.error(`Profile fetch error: ${fetchError.message}`);
          setProfileState(null); profileRef.current = null;
          setRoleState(null);
          return null;
        }
        const typedProfile = fetchedProfileData as Profile;
        console.log(`[AuthProvider] Profile successfully fetched for ${userId}.`);
        setProfileState(typedProfile); 
        setRoleState(typedProfile?.role || null);
        return typedProfile;
      } catch (errCatch: any) {
        console.error(`[AuthProvider] Exception in fetchUserProfile for ${userId}:`, errCatch);
        toast.error(`Profile operation failed: ${errCatch.message || 'Unknown error'}`);
        setProfileState(null); profileRef.current = null;
        setRoleState(null);
        return null;
      } finally {
        setProfileLoading(false);
        activeUserProfileFetch.current = null;
      }
    })();
    activeUserProfileFetch.current = fetchPromise;
    return fetchPromise;
  }, [clearAuthStates]); // Removed setProfileState, setRoleState setters as they don't change


  useEffect(() => {
    setLoading(true);
    let isMounted = true;
    console.log("[AuthProvider] Main Effect: Initializing session and auth listener.");

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      const initialUser = session?.user ?? null;
      console.log("[AuthProvider] Main Effect: getSession() resolved. Initial User ID:", initialUser?.id);
      
      userRef.current = initialUser; 
      setUserState(initialUser);

      if (initialUser) {
        if (profileRef.current?.id !== initialUser.id) {
          console.log("[AuthProvider] Main Effect: Initial user found, profileRef mismatch or missing. Fetching profile.");
          await fetchUserProfile(initialUser.id);
        } else {
            console.log("[AuthProvider] Main Effect: Initial user found, profileRef already matches.");
            if (!profileState) setProfileState(profileRef.current); // Sync state if it was cleared
            if (!roleState && profileRef.current) setRoleState(profileRef.current.role || null);
        }
      } else {
        clearAuthStates();
      }
      if (isMounted) setLoading(false);
    }).catch(error => {
      if (!isMounted) return;
      console.error("[AuthProvider] Main Effect: Error in getSession():", error);
      clearAuthStates();
      if (isMounted) setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        const newSessionUser = session?.user ?? null;
        const previousUserIdInRef = userRef.current?.id;

        console.log(
            `[AuthProvider] onAuthStateChange: Event: ${event}, Session User: ${newSessionUser?.id}, Prev User in Ref: ${previousUserIdInRef}`
        );

        userRef.current = newSessionUser; 
        setUserState(newSessionUser);    

        if (event === 'SIGNED_OUT') {
          console.log("[AuthProvider] onAuthStateChange: SIGNED_OUT. Clearing states.");
          clearAuthStates();
        } else if (newSessionUser) {
          // User is present
          if (newSessionUser.id !== previousUserIdInRef) {
            console.log(`[AuthProvider] onAuthStateChange: User ID changed or initial populated session. Old Ref: ${previousUserIdInRef}, New: ${newSessionUser.id}. Fetching profile.`);
            await fetchUserProfile(newSessionUser.id);
          } else if (event === 'USER_UPDATED' && newSessionUser.id === previousUserIdInRef) {
            console.log(`[AuthProvider] onAuthStateChange: USER_UPDATED for same user ${newSessionUser.id}. Re-fetching profile.`);
            await fetchUserProfile(newSessionUser.id, true); 
          } else if (event === 'TOKEN_REFRESHED' && (!profileRef.current || profileRef.current.id !== newSessionUser.id)) {
            console.log(`[AuthProvider] onAuthStateChange: TOKEN_REFRESHED, user ${newSessionUser.id} same, profile missing/mismatch in ref. Fetching profile.`);
            await fetchUserProfile(newSessionUser.id);
          } else if (event === 'INITIAL_SESSION' && (!profileRef.current || profileRef.current.id !== newSessionUser.id)){
            console.log(`[AuthProvider] onAuthStateChange: INITIAL_SESSION event from listener, user ${newSessionUser.id}, profile missing/mismatch in ref. Fetching profile.`);
            await fetchUserProfile(newSessionUser.id);
          } else {
            console.log(`[AuthProvider] onAuthStateChange: Event ${event} for user ${newSessionUser.id}, no profile fetch triggered by primary conditions.`);
          }
        } else { 
          // This 'else' block implies: event was NOT 'SIGNED_OUT' AND newSessionUser IS NULL
          console.log(`[AuthProvider] onAuthStateChange: Event ${event} resulted in null session user (and not SIGNED_OUT). Clearing states.`);
          clearAuthStates();
        }
      }
    );

    return () => {
      isMounted = false;
      console.log("[AuthProvider] Main Effect: Cleaning up listener.");
      authListener.subscription.unsubscribe();
      activeUserProfileFetch.current = null; 
    };
  }, [fetchUserProfile, clearAuthStates]); // Dependencies are stable memoized functions

  const ensureProfileLoaded = useCallback(async () => {
    const currentUser = userRef.current;
    const currentProfile = profileRef.current;
    if (currentUser && (!currentProfile || currentProfile.id !== currentUser.id) && !profileLoading && !activeUserProfileFetch.current) {
      console.log(`[AuthProvider] ensureProfileLoaded called: Profile for ${currentUser.id} needed. Fetching.`);
      await fetchUserProfile(currentUser.id);
    } else if (profileLoading || activeUserProfileFetch.current) {
        console.log(`[AuthProvider] ensureProfileLoaded: Profile fetch already in progress or queued for user ${currentUser?.id}.`);
    } else if (currentUser && currentProfile && currentProfile.id === currentUser.id) {
        console.log(`[AuthProvider] ensureProfileLoaded: Profile for ${currentUser.id} already loaded.`);
    } else if (!currentUser) {
        console.log(`[AuthProvider] ensureProfileLoaded: No user, cannot load profile.`);
    }
  }, [fetchUserProfile, profileLoading]);

  async function signInWithProvider(provider: Provider) {
    console.log(`[AuthProvider] Attempting sign in with ${provider}`);
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: `${window.location.origin}/auth/callback` }});
      if (error) throw error;
    } catch (error: any) { toast.error(`Sign in with ${provider} failed: ${error.message}`); console.error(`Sign in with ${provider} error:`, error); }
  }

  async function signInWithEmail(email: string) { 
    console.log(`[AuthProvider] Sending Email OTP to ${email}`);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/auth/callback` }});
      if (error) throw error;
    } catch (error: any) { console.error(`Email OTP initiation error for ${email}:`, error); throw error; }
  }

  async function verifyEmailOtp(email: string, token: string): Promise<{ user: SupabaseUser | null, session: SupabaseSession | null, error: Error | null }> {
    console.log(`[AuthProvider] Verifying Email OTP ${token} for ${email}`);
    try {
      const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' });
      if (error) throw error;
      toast.success("Email verified successfully! You are now logged in.");
      return { user: data.user, session: data.session, error: null };
    } catch (error: any) { 
      toast.error(`Email OTP verification failed: ${error.message}`); 
      console.error(`Email OTP verification error for ${email}:`, error); 
      return { user: null, session: null, error: error as Error }; 
    }
  }

  async function signInWithPhone(phone: string): Promise<void> {
    console.log(`[AuthProvider] Sending Phone OTP to ${phone}`);
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone: phone, options: { shouldCreateUser: true } });
      if (error) throw error;
    } catch (error: any) { console.error(`Phone OTP initiation error for ${phone}:`, error); throw error; }
  }

  async function verifyPhoneOtp(phone: string, token: string): Promise<{ user: SupabaseUser | null, session: SupabaseSession | null, error: Error | null }> {
    console.log(`[AuthProvider] Verifying Phone OTP ${token} for ${phone}`);
    try {
      const { data, error } = await supabase.auth.verifyOtp({ phone: phone, token, type: 'sms' });
      if (error) throw error;
      toast.success("Phone verified successfully! You are now logged in.");
      return { user: data.user, session: data.session, error: null };
    } catch (error: any) { 
      toast.error(`Phone OTP verification failed: ${error.message}`); 
      console.error(`Phone OTP verification error for ${phone}:`, error); 
      return { user: null, session: null, error: error as Error }; 
    }
  }

  async function signOut() {
    console.log("[AuthProvider] Signing out.");
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("Signed out successfully."); 
    } catch (error: any) { 
      toast.error(`Sign out failed: ${error.message}`); 
      console.error("Sign out error:", error); 
    }
  }

  return (
    <AuthContext.Provider value={{
      user: userState,
      profile: profileState,
      role: roleState,
      loading,
      profileLoading,
      signInWithProvider,
      signInWithEmail,
      verifyEmailOtp,
      signInWithPhone,
      verifyPhoneOtp,
      signOut,
      ensureProfileLoaded,
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