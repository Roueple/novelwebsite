// src/providers/auth-provider.tsx
"use client";

// FIX: Add useRef to the import
import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
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
  signInAnonymously: () => Promise<boolean>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [guestLoading, setGuestLoading] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  // Flag to prevent multiple profile creation attempts for the same user ID
  const profileCreationAttempted = useRef<Set<string>>(new Set()); // useRef is now imported

  // Memoized fetchUserProfile
  const fetchUserProfile = useCallback(async (userId: string, isUserAnonymous: boolean): Promise<UserRole | null> => {
    console.log(`[AuthProvider] Fetching profile for user ID: ${userId}, IsAnonymous: ${isUserAnonymous}`);
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('role, is_guest')
            .eq('id', userId)
            .single();

        if (error && error.code === 'PGRST116') {
            console.log(`[AuthProvider] Profile not found for ${userId}.`);
            // --- Profile Creation Logic ---
            if (isUserAnonymous && !profileCreationAttempted.current.has(userId)) {
                 profileCreationAttempted.current.add(userId);
                 console.log(`[AuthProvider] Creating profile for anonymous user ${userId}.`);
                 const randomPart = Math.random().toString(36).substring(2, 8);
                 const username = `anon_${randomPart}`;

                 const { error: insertError } = await supabase.from('profiles').insert({
                     id: userId, username: username, role: 'reader', is_guest: true
                 });
                 if (insertError) {
                     console.error(`[AuthProvider] Failed to create profile for ${userId}:`, insertError);
                     setRole(null); return null;
                 } else {
                     console.log(`[AuthProvider] Profile created for ${userId}. Role: reader, IsGuest: true, Username: ${username}`);
                     setRole('reader'); return 'reader';
                 }
             } else if (isUserAnonymous) {
                 console.log(`[AuthProvider] Profile creation already attempted for anonymous user ${userId}. Skipping.`);
                 setRole(null); return null;
             } else {
                 console.warn(`[AuthProvider] Profile not found for non-anonymous user ${userId}.`);
                 setRole(null); return null;
             }
            // --- End Profile Creation Logic ---
        } else if (error) {
            console.error(`[AuthProvider] Error fetching profile for ${userId}:`, error);
            setRole(null); return null;
        }

        // Profile exists
        const fetchedRole = data?.role ?? null;
        const fetchedIsGuest = data?.is_guest ?? false;
        setRole(fetchedRole);

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
        return fetchedRole;

    } catch (error) {
         console.error(`[AuthProvider] Exception fetching/creating profile for ${userId}:`, error);
         setRole(null); return null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Keep fetchUserProfile stable

  // Main Auth Listener Effect
  useEffect(() => {
    console.log("[AuthProvider] Setting up auth listener...");
    let isMounted = true;

    // Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (!isMounted) return;
        console.log("[AuthProvider] Initial session check result:", session);
        const initialUser = session?.user ?? null;
        const initialAnonymity = initialUser?.is_anonymous ?? false;

        setUser(current => current ?? initialUser);
        setIsAnonymous(current => !current ? initialAnonymity : current);

        if (initialUser) {
            setRole(currentRole => {
                if (currentRole === null) {
                    fetchUserProfile(initialUser.id, initialAnonymity);
                }
                return currentRole;
            });
        } else {
            setRole(null);
        }
        setLoading(false);
        console.log("[AuthProvider] Initial load finished.");
    });

    // Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!isMounted) return;
        console.log("[AuthProvider] Auth state changed:", event, session);

        const currentUser = session?.user ?? null;
        const currentAnonymity = currentUser?.is_anonymous ?? false;

        setUser(currentUser);
        setIsAnonymous(currentAnonymity);

        if (currentUser) {
            console.log("[AuthProvider] Fetching profile due to auth change...");
            await fetchUserProfile(currentUser.id, currentAnonymity);
        } else {
            setRole(null);
            profileCreationAttempted.current.clear();
            console.log("[AuthProvider] User signed out. Role cleared.");
        }
        setLoading(false);
    });

    return () => {
        isMounted = false;
        console.log("[AuthProvider] Unsubscribing from auth changes.");
        subscription.unsubscribe();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchUserProfile]);


  // --- Sign-in Methods ---

  async function signInWithProvider(provider: Provider) {
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

  async function signInAnonymously(): Promise<boolean> {
    if (user) { console.log("[AuthProvider] User already signed in."); return true; }
    console.log("[AuthProvider] Attempting anonymous sign in...");
    setGuestLoading(true); setLoading(true);
    try {
        const { data: { user: anonUser }, error: anonError } = await supabase.auth.signInAnonymously();
        if (anonError) throw anonError;
        if (!anonUser) throw new Error("Anonymous sign in failed: No user object returned.");
        console.log("[AuthProvider] Anonymous user created/signed in:", anonUser.id);

        const profileRole = await fetchUserProfile(anonUser.id, true);

        setUser(anonUser);
        setIsAnonymous(true);
        setRole(profileRole);

        console.log("[AuthProvider] Anonymous state set:", { user: anonUser.id, isAnonymous: true, role: profileRole });
        toast.success("Commenting as Guest");
        return true;

    } catch (error: any) {
        console.error("Error in signInAnonymously:", error);
        toast.error(error.message || "Failed to sign in as guest.");
        setUser(null); setRole(null); setIsAnonymous(false);
        return false;
    } finally {
        setGuestLoading(false); setLoading(false);
        console.log("[AuthProvider] Anonymous sign in process finished.");
    }
  }


  async function signOut() {
    console.log("[AuthProvider] Signing out...");
    try {
        if(user) profileCreationAttempted.current.delete(user.id);
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
