// src/providers/auth-provider.tsx
"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { User as SupabaseUser, Session as SupabaseSession, Provider } from '@supabase/supabase-js';
import type { Profile as AppProfile, UserRole as AppUserRole } from '@/types';
import { toast } from 'sonner';

interface AuthContextType {
  user: SupabaseUser | null;
  profile: AppProfile | null;
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
      return activeUserProfileFetch.current;
    }
    setProfileLoading(true);
    const fetchPromise = (async (): Promise<AppProfile | null> => {
      try {
        const { data: fetchedProfileData, error: fetchError } = await supabase
          .from('profiles')
          .select('id, username, display_name, role, email, comment_count, experience_points, level, chapters_read_count, created_at, updated_at, active_title, profile_cosmetics, vip_tier')
          .eq('id', userId)
          .single();
        if (fetchError && fetchError.code === 'PGRST116') { console.warn(`[AuthProvider] Profile not found for user ${userId}.`); setProfile(null); setRole(null); return null; }
        else if (fetchError) { console.error(`[AuthProvider] Error fetching profile for ${userId}:`, fetchError); toast.error(`Profile fetch error: ${fetchError.message}`); setProfile(null); setRole(null); return null; }
        const typedProfile = fetchedProfileData as AppProfile;
        setProfile(typedProfile);
        setRole(typedProfile?.role || null);
        return typedProfile;
      } catch (errCatch: any) { console.error(`[AuthProvider] Exception in fetchUserProfile for ${userId}:`, errCatch); toast.error(`Profile operation failed: ${errCatch.message || 'Unknown error'}`); setProfile(null); setRole(null); return null; }
      finally { setProfileLoading(false); activeUserProfileFetch.current = null; }
    })();
    activeUserProfileFetch.current = fetchPromise;
    return fetchPromise;
  }, []);

  useEffect(() => {
    setLoading(true);
    let isMounted = true;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      const initialUser = session?.user ?? null;
      setUser(initialUser);
      if (initialUser) { await fetchUserProfile(initialUser.id); }
      else { clearAuthStates(); }
      if (isMounted) setLoading(false);
    }).catch(error => {
        if(!isMounted) return; console.error("[AuthProvider] Error in initial getSession():", error); clearAuthStates(); if (isMounted) setLoading(false);
    });
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        const currentUser = session?.user ?? null;
        const previousUser = userRef.current;
        setUser(currentUser);
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION') {
          if (currentUser) {
            if (!profile || profile.id !== currentUser.id || previousUser?.id !== currentUser.id) {
              await fetchUserProfile(currentUser.id);
            }
          } else { clearAuthStates(); }
        } else if (event === 'SIGNED_OUT') { clearAuthStates(); }
      }
    );
    return () => { isMounted = false; authListener.subscription.unsubscribe(); activeUserProfileFetch.current = null; };
  }, [fetchUserProfile, clearAuthStates, profile]);

  const ensureProfileLoaded = useCallback(async () => {
    const currentUser = userRef.current;
    if (currentUser && (!profile || profile.id !== currentUser.id) && !profileLoading && !activeUserProfileFetch.current) {
      await fetchUserProfile(currentUser.id);
    }
  }, [fetchUserProfile, profile, profileLoading]);

  async function signInWithProvider(provider: Provider) {
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: `${window.location.origin}/auth/callback` }});
      if (error) throw error;
    } catch (error: any) { toast.error(`Sign in with ${provider} failed: ${error.message}`); console.error(`Sign in with ${provider} error:`, error); }
  }

  async function signInWithEmail(email: string) { // Email OTP initiator
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
    } catch (error: any) { toast.error(`Email OTP verification failed: ${error.message}`); console.error(`Email OTP verification error for ${email}:`, error); return { user: null, session: null, error: error as Error }; }
  }

  async function signInWithPhone(phone: string): Promise<void> { // Phone OTP initiator
    console.log(`[AuthProvider] Sending Phone OTP to ${phone}`);
    try {
      // Ensure phone is E.164 format (e.g., +1XXXXXXXXXX) for Supabase
      const { error } = await supabase.auth.signInWithOtp({
        phone: phone,
        options: { shouldCreateUser: true } // No emailRedirectTo needed for phone OTP usually
      });
      if (error) throw error;
      // Toast handled by calling component (LoginForm)
    } catch (error: any) {
      console.error(`Phone OTP initiation error for ${phone}:`, error);
      throw error; // Re-throw so calling component knows and can toast
    }
  }

  async function verifyPhoneOtp(phone: string, token: string): Promise<{ user: SupabaseUser | null, session: SupabaseSession | null, error: Error | null }> {
    console.log(`[AuthProvider] Verifying Phone OTP ${token} for ${phone}`);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: phone, // Ensure phone is E.164 format
        token,
        type: 'sms', // Common type for phone OTP verification
      });
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
    } catch (error: any) { toast.error(`Sign out failed: ${error.message}`); console.error("Sign out error:", error); }
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
      verifyEmailOtp,
      signInWithPhone,   // Added
      verifyPhoneOtp,    // Added
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