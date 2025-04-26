// src/providers/auth-provider.tsx
"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import { UserRole } from '@/types/supabase';
import { toast } from 'sonner';

const GUEST_ID_STORAGE_KEY = 'pending_guest_merge_id';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  loading: boolean;
  guestLoading: boolean;
  isGuest: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string) => Promise<void>;
  signInWithPhone: (phone: string) => Promise<void>;
  signInAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [guestLoading, setGuestLoading] = useState(false);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    console.log("[AuthProvider] Initializing...");
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("[AuthProvider] Initial session:", session);
      const initialUser = session?.user ?? null;
      setUser(initialUser);
      if (initialUser) {
        fetchUserProfile(initialUser.id);
      } else {
         setRole(null);
         setIsGuest(false);
      }
      setLoading(false);
      console.log("[AuthProvider] Initial load finished.");
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[AuthProvider] Auth state changed:", event, session);
      const currentUser = session?.user ?? null;
      setUser(currentUser); // Update user state first
      if (currentUser) {
          await fetchUserProfile(currentUser.id); // Fetch profile on change

          // --- Merge Check ---
          const oldGuestUserId = sessionStorage.getItem(GUEST_ID_STORAGE_KEY);
          // FIX: Check if session exists before accessing session.access_token
          if (oldGuestUserId && oldGuestUserId !== currentUser.id && event === 'SIGNED_IN' && session) {
              console.log(`[AuthProvider] New user signed in (${currentUser.id}), attempting merge with old guest (${oldGuestUserId}).`);
              sessionStorage.removeItem(GUEST_ID_STORAGE_KEY);
              // Pass the access token from the non-null session
              invokeMergeFunction(oldGuestUserId, session.access_token);
          } else if (oldGuestUserId && oldGuestUserId === currentUser.id) {
              console.log("[AuthProvider] New user is the same as stored guest ID. Clearing storage.");
              sessionStorage.removeItem(GUEST_ID_STORAGE_KEY);
          }
          // --- End Merge Check ---

      } else {
        setRole(null);
        setIsGuest(false);
        sessionStorage.removeItem(GUEST_ID_STORAGE_KEY);
        console.log("[AuthProvider] User signed out. Role/Guest status cleared.");
      }
       if (loading) setLoading(false);
    });

    return () => {
        console.log("[AuthProvider] Unsubscribing from auth changes.");
        subscription.unsubscribe();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  async function invokeMergeFunction(oldGuestUserId: string, accessToken?: string) {
      if (!accessToken) {
          console.error("[AuthProvider] Cannot invoke merge function: Missing access token.");
          toast.warning("Could not link guest activity (auth error).");
          return;
      }
      console.log("[AuthProvider] Invoking merge-guest-account function...");
      try {
          const { data: mergeResult, error: mergeError } = await supabase.functions.invoke(
              'merge-guest-account',
              {
                  body: { old_guest_user_id: oldGuestUserId },
                  headers: { Authorization: `Bearer ${accessToken}` }
              }
          );
          if (mergeError || !mergeResult?.success) {
              console.error("[AuthProvider] Merge function invocation failed:", mergeError, mergeResult);
              toast.error("Failed to link previous guest activity.");
          } else {
              console.log("[AuthProvider] Account merge successful:", mergeResult.message);
              toast.success("Guest activity linked successfully!");
              if(user) await fetchUserProfile(user.id); // Re-fetch profile after successful merge
          }
      } catch (invokeError) {
           console.error("[AuthProvider] Error invoking merge function:", invokeError);
           toast.error("An error occurred while linking guest activity.");
      }
  }


  async function fetchUserProfile(userId: string) {
    console.log(`[AuthProvider] Fetching profile for user ID: ${userId}`);
    try {
        const { data, error } = await supabase
        .from('profiles')
        .select('role, is_guest')
        .eq('id', userId)
        .single();

        if (error && error.code === 'PGRST116') {
            console.log(`[AuthProvider] Profile not found for ${userId}. Setting role/guest status to null/false.`);
            setRole(null);
            setIsGuest(false);
            return;
        } else if (error) {
            console.error(`[AuthProvider] Error fetching profile for ${userId}:`, error);
            setRole(null);
            setIsGuest(false);
            return;
        }

        const fetchedRole = data?.role ?? null;
        const fetchedIsGuest = data?.is_guest ?? false;
        setRole(fetchedRole);
        setIsGuest(fetchedIsGuest);
        console.log(`[AuthProvider] Profile fetched for ${userId}:`, { role: fetchedRole, isGuest: fetchedIsGuest });
    } catch (error) {
         console.error(`[AuthProvider] Exception fetching profile for ${userId}:`, error);
         setRole(null);
         setIsGuest(false);
    }
  }

  const prepareForMerge = () => {
      if (user && isGuest) {
          console.log(`[AuthProvider] Storing guest ID ${user.id} for potential merge.`);
          sessionStorage.setItem(GUEST_ID_STORAGE_KEY, user.id);
      } else {
          console.log("[AuthProvider] Clearing potential guest merge ID (not a guest or no user).");
          sessionStorage.removeItem(GUEST_ID_STORAGE_KEY);
      }
  }

  async function signInWithGoogle() {
    prepareForMerge();
    try {
        const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` } });
        if (error) throw error;
    } catch (error) {
        console.error("Google Sign in error:", error);
        toast.error('Google Sign in failed. Please try again.');
        sessionStorage.removeItem(GUEST_ID_STORAGE_KEY);
    }
  }

  async function signInWithEmail(email: string) {
     prepareForMerge();
     try {
        const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } });
        if (error) throw error;
        toast.info(`Magic link sent to ${email}`);
     } catch (error) {
         console.error("Email Sign in error:", error);
         toast.error('Email Sign in failed. Please try again.');
         sessionStorage.removeItem(GUEST_ID_STORAGE_KEY);
     }
  }

  async function signInWithPhone(phone: string) {
     prepareForMerge();
     try {
        const { error } = await supabase.auth.signInWithOtp({ phone });
        if (error) throw error;
        toast.info(`OTP sent to ${phone}`);
     } catch (error) {
          console.error("Phone Sign in error:", error);
         toast.error('Phone Sign in failed. Please try again.');
         sessionStorage.removeItem(GUEST_ID_STORAGE_KEY);
     }
  }

  async function signInAsGuest() {
    console.log("[AuthProvider] Attempting guest sign in...");
    setGuestLoading(true);
    setLoading(true);
    try {
        const randomNum = Math.floor(1000 + Math.random() * 900000);
        const username = `anon#${randomNum}`;
        const tempEmail = `${username}@guest.novelwebsite.com`;
        const tempPassword = crypto.randomUUID();

        console.log(`[AuthProvider] Signing up guest with email: ${tempEmail}`);
        const { data: { user: guestUser }, error: signUpError } = await supabase.auth.signUp({
            email: tempEmail, password: tempPassword,
        });

        if (signUpError) throw new Error(`Guest signup error: ${signUpError.message}`);
        if (!guestUser) throw new Error("Guest user creation failed in Supabase Auth.");
        console.log("[AuthProvider] Guest user created in Auth:", guestUser.id);

        console.log(`[AuthProvider] Inserting guest profile for ${guestUser.id} with username ${username}`);
        const { error: profileError } = await supabase.from('profiles').insert({
            id: guestUser.id, username: username, role: 'reader', is_guest: true
        });

        if (profileError) throw new Error(`Guest profile creation error: ${profileError.message}`);
        console.log("[AuthProvider] Guest profile created successfully.");

        // Manually set state immediately
        setUser(guestUser);
        setRole('reader');
        setIsGuest(true);
        console.log("[AuthProvider] Guest state set manually:", { user: guestUser.id, role: 'reader', isGuest: true });
        toast.success("Signed in as Guest!");

    } catch (error: any) {
        console.error("Error in signInAsGuest:", error);
        toast.error(error.message || "Failed to sign in as guest.");
        setUser(null); setRole(null); setIsGuest(false);
    } finally {
        setGuestLoading(false);
        setLoading(false);
        console.log("[AuthProvider] Guest sign in process finished.");
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
      isGuest,
      signInWithGoogle,
      signInWithEmail,
      signInWithPhone,
      signInAsGuest,
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
