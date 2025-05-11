// src/providers/auth-provider.tsx
"use client";
import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { User, Provider, Session } from '@supabase/supabase-js';
import { UserRole, Profile } from '@/types/supabase'; // Your existing types
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  role: UserRole | null;
  loading: boolean;
  profileLoading: boolean;
  isAnonymous: boolean;
  guestLoading: boolean;
  signInWithProvider: (provider: Provider) => Promise<void>;
  signInWithEmail: (email: string) => Promise<void>;
  signInWithPhone: (phone: string) => Promise<void>;
  signInAnonymously: () => Promise<boolean>;
  signOut: () => Promise<void>;
  ensureProfileLoaded: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);

  const activeUserProfileFetch = useRef<Promise<Profile | null> | null>(null);
  const profileCreationAttempted = useRef<Set<string>>(new Set());
  const userRef = useRef<User | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const clearAuthStates = useCallback((isSigningOut = false) => {
    console.log("[AuthProvider] clearAuthStates called");
    setUser(null);
    setProfile(null);
    setRole(null);
    setIsAnonymous(false);
    if (isSigningOut && userRef.current) {
      profileCreationAttempted.current.delete(userRef.current.id);
    }
  }, []);

  const fetchUserProfile = useCallback(async (userId: string, isUserSupabaseAnonymous: boolean): Promise<Profile | null> => {
    if (activeUserProfileFetch.current) {
      console.log(`[AuthProvider] fetchUserProfile: Active fetch ongoing for ${userId}. Awaiting.`);
      return activeUserProfileFetch.current;
    }

    console.log(`[AuthProvider] fetchUserProfile: Attempting for user ID: ${userId}, Supabase is_anonymous: ${isUserSupabaseAnonymous}`);
    setProfileLoading(true);

    const fetchPromise = (async (): Promise<Profile | null> => {
      try {
        const { data: fetchedProfileData, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (fetchError && fetchError.code === 'PGRST116') {
          console.log(`[AuthProvider] Profile not found for ${userId}.`);
          if (isUserSupabaseAnonymous) {
            if (profileCreationAttempted.current.has(userId)) {
              console.log(`[AuthProvider] Profile creation already attempted for anon user ${userId}.`);
              setProfile(null); setRole(null); return null;
            }
            profileCreationAttempted.current.add(userId);
            console.log(`[AuthProvider] Creating profile for anonymous user ${userId}.`);
            const guestUsername = `guest_${userId.substring(0, 6)}`;
            const { data: newProfile, error: insertError } = await supabase
              .from('profiles')
              .insert({ id: userId, username: guestUsername, role: 'reader', is_guest: true })
              .select('*').single();
            if (insertError) {
              console.error(`[AuthProvider] Failed to create profile for anon ${userId}:`, insertError);
              toast.error(`Guest profile init failed: ${insertError.message}`);
              setProfile(null); setRole(null); return null;
            }
            console.log(`[AuthProvider] Anonymous profile created for ${userId}:`, newProfile);
            setProfile(newProfile as Profile);
            setRole((newProfile as Profile)?.role || null);
            return newProfile as Profile;
          } else {
            console.warn(`[AuthProvider] Profile not found for non-anonymous user ${userId}.`);
            setProfile(null); setRole(null); return null;
          }
        } else if (fetchError) {
          console.error(`[AuthProvider] Error fetching profile for ${userId}:`, fetchError);
          toast.error(`Profile fetch error: ${fetchError.message}`);
          setProfile(null); setRole(null); return null;
        }

        const typedProfile = fetchedProfileData as Profile;
        console.log(`[AuthProvider] Profile successfully fetched for ${userId}:`, typedProfile);
        setProfile(typedProfile);
        setRole(typedProfile?.role || null);

        if (!isUserSupabaseAnonymous && typedProfile?.is_guest) {
          console.log(`[AuthProvider] User ${userId} registered, updating profile.is_guest.`);
          const { data: updatedProfileData, error: updateError } = await supabase
            .from('profiles')
            .update({ is_guest: false })
            .eq('id', userId)
            .select('*')
            .single();
          if (updateError) {
            console.error(`[AuthProvider] Failed to update is_guest for ${userId}:`, updateError);
          } else if (updatedProfileData) {
            console.log(`[AuthProvider] Profile is_guest updated for ${userId}.`);
            setProfile(updatedProfileData as Profile);
          }
        }
        return typedProfile;
      } catch (errCatch: any) {
        console.error(`[AuthProvider] Exception in fetchUserProfile for ${userId}:`, errCatch);
        toast.error(`Profile operation failed: ${errCatch.message || 'Unknown error'}`);
        setProfile(null); setRole(null); return null;
      } finally {
        setProfileLoading(false);
        activeUserProfileFetch.current = null;
      }
    })();
    activeUserProfileFetch.current = fetchPromise;
    return fetchPromise;
  }, [clearAuthStates]);

  useEffect(() => {
    setLoading(true);
    let isMounted = true;
    console.log("[AuthProvider] Main Effect: Setting up session check and auth listener.");

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      console.log("[AuthProvider] Initial getSession() result:", session);
      const initialSupabaseUser = session?.user ?? null;

      setUser(initialSupabaseUser);
      setIsAnonymous(initialSupabaseUser?.is_anonymous ?? false);

      if (initialSupabaseUser) {
        if (!profile || profile.id !== initialSupabaseUser.id) {
          console.log("[AuthProvider] Initial session: User exists, profile not loaded or for different user. Fetching.");
          // FIX: Ensure boolean is passed
          await fetchUserProfile(initialSupabaseUser.id, initialSupabaseUser.is_anonymous ?? false);
        } else {
          console.log("[AuthProvider] Initial session: User exists, profile already in state for this user.");
        }
      } else {
        clearAuthStates();
      }
      setLoading(false);
      console.log("[AuthProvider] Initial Supabase session and potential profile load finished.");
    }).catch(error => {
      if (!isMounted) return;
      console.error("[AuthProvider] Error in initial getSession():", error);
      clearAuthStates();
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event: string, session: Session | null) => {
        if (!isMounted) return;
        console.log(`[AuthProvider] onAuthStateChange event: ${event}`, session);

        const currentSupabaseUser = session?.user ?? null;
        const currentSupabaseAnonymity = currentSupabaseUser?.is_anonymous ?? false; // This will be boolean
        const previousUserFromRef = userRef.current;

        setUser(currentSupabaseUser);
        setIsAnonymous(currentSupabaseAnonymity);

        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          if (currentSupabaseUser) {
            console.log(`[AuthProvider] Event ${event}: Triggering profile fetch for ${currentSupabaseUser.id}`);
            await fetchUserProfile(currentSupabaseUser.id, currentSupabaseAnonymity);
          } else {
            clearAuthStates();
          }
        } else if (event === 'SIGNED_OUT') {
          clearAuthStates(true);
          console.log("[AuthProvider] User signed out. Cleared states.");
        } else if (event === 'INITIAL_SESSION') {
          if (currentSupabaseUser) {
            if (!profile || profile.id !== currentSupabaseUser.id) {
              console.log(`[AuthProvider] Event INITIAL_SESSION: User ${currentSupabaseUser.id} present, profile not in state or different. Fetching profile.`);
              await fetchUserProfile(currentSupabaseUser.id, currentSupabaseAnonymity);
            } else {
              console.log(`[AuthProvider] Event INITIAL_SESSION: User ${currentSupabaseUser.id} present, profile already in state.`);
            }
          } else {
            clearAuthStates();
          }
        } else if (currentSupabaseUser && (!profile || profile.id !== currentSupabaseUser.id) && !profileLoading && !activeUserProfileFetch.current) {
          console.log(`[AuthProvider] Event ${event}: User ${currentSupabaseUser.id} exists, profile not loaded. To be fetched on demand.`);
        }
      }
    );

    return () => {
      isMounted = false;
      console.log("[AuthProvider] Main Effect Cleanup: Unsubscribing from auth changes.");
      authListener.subscription.unsubscribe();
    };
  }, [fetchUserProfile, clearAuthStates, profile]);

  const ensureProfileLoaded = useCallback(async () => {
    const currentUser = userRef.current;
    if (currentUser && (!profile || profile.id !== currentUser.id) && !profileLoading && !activeUserProfileFetch.current) {
      console.log(`[AuthProvider] ensureProfileLoaded: Profile for ${currentUser.id} needed and not loaded/loading. Fetching.`);
      // FIX: Ensure boolean is passed
      await fetchUserProfile(currentUser.id, currentUser.is_anonymous ?? false);
    } else if (currentUser && profile && profile.id === currentUser.id) {
      console.log(`[AuthProvider] ensureProfileLoaded: Profile already loaded for ${currentUser.id}.`);
    } else if (!currentUser) {
      console.log(`[AuthProvider] ensureProfileLoaded: No user, cannot load profile.`);
    } else if (profileLoading || activeUserProfileFetch.current) {
      console.log(`[AuthProvider] ensureProfileLoaded: Profile for ${currentUser.id} is already being fetched.`);
    }
  }, [profile, profileLoading, fetchUserProfile]);

  async function signInWithProvider(provider: Provider) {
    const currentUser = userRef.current;
    const currentIsAnon = isAnonymous;
    try {
      if (currentUser && currentIsAnon) {
        console.log(`[AuthProvider] Linking ${provider} to anonymous user ${currentUser.id}`);
        const { error } = await supabase.auth.linkIdentity({ provider, options: { redirectTo: `${window.location.origin}/auth/callback` } });
        if (error) throw error;
        toast.info(`Redirecting to ${provider} to link account...`);
      } else {
        console.log(`[AuthProvider] Signing in with ${provider}`);
        const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: `${window.location.origin}/auth/callback` } });
        if (error) throw error;
      }
    } catch (error: any) { toast.error(`Operation with ${provider} failed: ${error.message}`); }
  }

  async function signInWithEmail(email: string) {
    try {
      const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } });
      if (error) throw error;
      toast.info(`Verification link sent to ${email}.`);
    } catch (error: any) { toast.error(`Email sign in failed: ${error.message}`); }
  }

  async function signInWithPhone(phone: string) {
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone });
      if (error) throw error;
      toast.info(`OTP sent to ${phone}.`);
    } catch (error: any) { toast.error(`Phone sign in failed: ${error.message}`); }
  }

  async function signInAnonymously(): Promise<boolean> {
    if (userRef.current) { console.log("[AuthProvider] User already exists."); return true; }
    setGuestLoading(true);
    try {
      const { data: { user: anonUser }, error: anonError } = await supabase.auth.signInAnonymously();
      if (anonError) throw anonError;
      if (!anonUser) throw new Error("Anonymous sign in failed: No user object returned.");
      toast.success("Proceeding anonymously.");
      return true;
    } catch (error: any) {
      toast.error(error.message || "Failed to sign in as guest.");
      clearAuthStates(); return false;
    } finally { setGuestLoading(false); }
  }

  async function signOut() {
    try {
      const currentUser = userRef.current;
      if (currentUser) profileCreationAttempted.current.delete(currentUser.id);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("Signed out successfully.");
    } catch (error: any) { toast.error(`Sign out failed: ${error.message}`); }
  }

  return (
    <AuthContext.Provider value={{
      user, profile, role, loading, profileLoading, isAnonymous, guestLoading,
      signInWithProvider, signInWithEmail, signInWithPhone, signInAnonymously, signOut,
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