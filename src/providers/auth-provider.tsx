// src/providers/auth-provider.tsx
"use client";
import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { User, Provider } from '@supabase/supabase-js';
import { UserRole, Profile } from '@/types/supabase'; // Assuming Profile type is defined
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  profile: Profile | null; // Keep profile state if other parts of app use it
  role: UserRole | null;
  loading: boolean; // True while initial Supabase session is loading
  profileLoading: boolean; // True while fetching from 'profiles' table
  isAnonymous: boolean; // Reflects user.is_anonymous from Supabase
  guestLoading: boolean; // From your existing code, for anonymous sign-in process
  signInWithProvider: (provider: Provider) => Promise<void>;
  signInWithEmail: (email: string) => Promise<void>;
  signInWithPhone: (phone: string) => Promise<void>; // If you use it
  signInAnonymously: () => Promise<boolean>; // Keep this if you use it
  signOut: () => Promise<void>;
  ensureProfileLoaded: () => Promise<void>; // New function
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null); // Keep profile state
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true); // For Supabase session
  const [profileLoading, setProfileLoading] = useState(false); // For your 'profiles' table
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false); // Keep if used

  // To prevent concurrent calls to fetchUserProfile for the same user
  const activeUserProfileFetch = useRef<Promise<Profile | null> | null>(null);
  // To track if profile creation was attempted for an anonymous user to prevent loops
  const profileCreationAttempted = useRef<Set<string>>(new Set());


  const clearAuthStates = useCallback(() => {
    setUser(null);
    setProfile(null);
    setRole(null);
    setIsAnonymous(false);
    // Do NOT clear profileCreationAttempted here, as it's per user session lifecycle
  }, []);

  const fetchUserProfile = useCallback(async (userId: string, isUserSupabaseAnonymous: boolean): Promise<Profile | null> => {
    if (activeUserProfileFetch.current) {
        console.log(`[AuthProvider] fetchUserProfile: Already fetching for ${userId}, awaiting existing.`);
        return activeUserProfileFetch.current;
    }

    console.log(`[AuthProvider] fetchUserProfile: Fetching profile for user ID: ${userId}, Supabase is_anonymous: ${isUserSupabaseAnonymous}`);
    setProfileLoading(true);

    const fetchPromise = (async (): Promise<Profile | null> => {
        try {
            const { data: fetchedProfileData, error } = await supabase
                .from('profiles')
                .select('*') // Fetch all fields, including role, is_guest etc.
                .eq('id', userId)
                .single();

            if (error && error.code === 'PGRST116') { // Profile not found
                console.log(`[AuthProvider] Profile not found for ${userId}.`);
                if (isUserSupabaseAnonymous && !profileCreationAttempted.current.has(userId)) {
                    profileCreationAttempted.current.add(userId);
                    console.log(`[AuthProvider] Creating profile for anonymous user ${userId}.`);
                    const guestUsername = `guest_${userId.substring(0, 6)}`;
                    const { data: newProfile, error: insertError } = await supabase
                        .from('profiles')
                        .insert({
                            id: userId,
                            username: guestUsername, // Or your existing naming convention
                            role: 'reader',         // Default role
                            is_guest: true          // Mark as guest profile
                        })
                        .select('*')
                        .single();

                    if (insertError) {
                        console.error(`[AuthProvider] Failed to create profile for anonymous ${userId}:`, insertError);
                        toast.error(`Failed to initialize guest profile: ${insertError.message}`);
                        setProfile(null); setRole(null);
                        return null;
                    }
                    console.log(`[AuthProvider] Anonymous profile created for ${userId}:`, newProfile);
                    setProfile(newProfile);
                    setRole(newProfile?.role || null);
                    return newProfile;
                } else if (isUserSupabaseAnonymous) {
                    console.log(`[AuthProvider] Profile creation already attempted or not an anonymous user ${userId}. No profile created.`);
                    setProfile(null); setRole(null);
                    return null;
                } else {
                     console.warn(`[AuthProvider] Profile not found for non-anonymous user ${userId}. This user should have a profile.`);
                     setProfile(null); setRole(null);
                     return null;
                }
            } else if (error) {
                console.error(`[AuthProvider] Error fetching profile for ${userId}:`, error);
                setProfile(null); setRole(null);
                return null;
            }

            // Profile exists
            console.log(`[AuthProvider] Profile fetched for ${userId}:`, fetchedProfileData);
            setProfile(fetchedProfileData);
            setRole(fetchedProfileData?.role || null);

            // If Supabase user is no longer anonymous, but profile.is_guest is still true, update it.
            if (!isUserSupabaseAnonymous && fetchedProfileData?.is_guest) {
                console.log(`[AuthProvider] User ${userId} is registered but profile.is_guest is true. Updating.`);
                const { error: updateError } = await supabase
                    .from('profiles')
                    .update({ is_guest: false })
                    .eq('id', userId);
                if (updateError) {
                    console.error(`[AuthProvider] Failed to update is_guest for ${userId}:`, updateError);
                } else {
                    // Re-set profile with updated data if needed, or rely on next fetch
                    if (fetchedProfileData) fetchedProfileData.is_guest = false;
                    setProfile(fetchedProfileData); // Update local state
                }
            }
            return fetchedProfileData;
        } catch (errCatch) {
            console.error(`[AuthProvider] Exception in fetchUserProfile for ${userId}:`, errCatch);
            setProfile(null); setRole(null);
            return null;
        } finally {
            setProfileLoading(false);
            activeUserProfileFetch.current = null;
        }
    })();

    activeUserProfileFetch.current = fetchPromise;
    return fetchPromise;

  }, []); // Removed dependencies that might cause it to redefine too often

  // Effect for initial session check and auth state changes
  useEffect(() => {
    setLoading(true); // For initial Supabase session loading
    let isMounted = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      console.log("[AuthProvider] Initial session check result:", session);
      const initialSupabaseUser = session?.user ?? null;
      setUser(initialSupabaseUser);
      setIsAnonymous(initialSupabaseUser?.is_anonymous ?? false);
      // Do NOT fetch profile here by default to keep it lazy
      setLoading(false); // Supabase session loading is done
      console.log("[AuthProvider] Initial Supabase session load finished.");
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      console.log("[AuthProvider] Auth state changed:", event, session);
      const currentSupabaseUser = session?.user ?? null;
      const currentSupabaseAnonymity = currentSupabaseUser?.is_anonymous ?? false;

      setUser(currentSupabaseUser);
      setIsAnonymous(currentSupabaseAnonymity);

      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        // Critical events where profile/role might have changed or needs to be created
        if (currentSupabaseUser) {
          console.log(`[AuthProvider] Event ${event}: Fetching profile for ${currentSupabaseUser.id}`);
          await fetchUserProfile(currentSupabaseUser.id, currentSupabaseAnonymity);
        } else {
          clearAuthStates(); // Should not happen if SIGNED_IN has a user
        }
      } else if (event === 'SIGNED_OUT') {
        if (user) profileCreationAttempted.current.delete(user.id); // Clear attempt for the signed-out user
        clearAuthStates();
        console.log("[AuthProvider] User signed out. Cleared states.");
      } else if (currentSupabaseUser && !profile && !profileLoading && !activeUserProfileFetch.current) {
        // This case handles a scenario where a session exists (e.g. TOKEN_REFRESHED on page load)
        // but the profile (and thus role) hasn't been loaded into the provider's state yet.
        // However, for a "quick fix", we want to avoid this automatic fetch on every page.
        // It will be handled by ensureProfileLoaded when a component needs it.
        console.log("[AuthProvider] Token refreshed, user exists, profile not yet loaded. Profile will be fetched on demand.");
      }
      setLoading(false); // Supabase session aspect is resolved
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [fetchUserProfile, clearAuthStates, user]); // user is from state

  const ensureProfileLoaded = useCallback(async () => {
    if (user && !profile && !profileLoading && !activeUserProfileFetch.current) {
      // Only fetch if user exists, profile is not loaded, and no fetch is in progress
      console.log(`[AuthProvider] ensureProfileLoaded: Profile needed for ${user.id}, fetching.`);
      await fetchUserProfile(user.id, isAnonymous); // isAnonymous from state
    } else if (user && profile) {
      console.log(`[AuthProvider] ensureProfileLoaded: Profile already loaded for ${user.id}.`);
    } else if (!user) {
      console.log(`[AuthProvider] ensureProfileLoaded: No user, cannot load profile.`);
    }
  }, [user, profile, profileLoading, fetchUserProfile, isAnonymous]);

  // --- Sign-in/out Methods (largely unchanged but ensure they don't aggressively fetch profile) ---
  async function signInWithProvider(provider: Provider) {
    // setLoading(true); // Set loading for the auth action itself
    // setProfileLoading(true); // Profile will be fetched on SIGNED_IN event
    try {
      // Linking logic for anonymous users (if you keep signInAnonymously)
      if (user && isAnonymous) {
          console.log(`[AuthProvider] Linking ${provider} to anonymous user ${user.id}`);
          const { error } = await supabase.auth.linkIdentity({ provider: provider, options: { redirectTo: `${window.location.origin}/auth/callback` } });
          if (error) throw error;
          toast.info(`Redirecting to ${provider} to link account...`);
      } else {
          console.log(`[AuthProvider] Signing in with ${provider}`);
          const { error } = await supabase.auth.signInWithOAuth({ provider: provider, options: { redirectTo: `${window.location.origin}/auth/callback` } });
          if (error) throw error;
      }
    } catch (error: any) {
      console.error(`Error with ${provider}:`, error);
      toast.error(`Operation with ${provider} failed: ${error.message}`);
    } finally {
      // setLoading(false);
    }
  }

  async function signInWithEmail(email: string) {
    // setLoading(true);
    // setProfileLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } });
      if (error) throw error;
      toast.info(`Verification link sent to ${email}. Check your inbox.`);
    } catch (error: any) {
      console.error("Email Sign in error:", error);
      toast.error(`Email sign in failed: ${error.message}`);
    } finally {
      // setLoading(false);
    }
  }

  async function signInWithPhone(phone: string) { /* ... similar ... */ }

  async function signInAnonymously(): Promise<boolean> {
    if (user) { console.log("[AuthProvider] User already exists."); return true; }
    console.log("[AuthProvider] Attempting anonymous sign in...");
    setGuestLoading(true); // Use guestLoading for this specific flow
    // setLoading(true); // Also set general loading as an auth operation is happening
    try {
        const { data: { user: anonUser }, error: anonError } = await supabase.auth.signInAnonymously();
        if (anonError) throw anonError;
        if (!anonUser) throw new Error("Anonymous sign in failed: No user object returned.");
        // onAuthStateChange with 'SIGNED_IN' will trigger profile fetch
        toast.success("Commenting as Guest (or proceeding anonymously)");
        return true;
    } catch (error: any) {
        console.error("Error in signInAnonymously:", error);
        toast.error(error.message || "Failed to sign in as guest.");
        clearAuthStates(); // Ensure states are cleared on failure
        return false;
    } finally {
        setGuestLoading(false);
        // setLoading(false);
    }
  }

  async function signOut() {
    // setLoading(true);
    try {
      if (user) profileCreationAttempted.current.delete(user.id);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      // onAuthStateChange with 'SIGNED_OUT' will clear states
      toast.success("Signed out successfully.");
    } catch (error: any) {
      console.error("Sign out error:", error);
      toast.error(`Sign out failed: ${error.message}`);
    } finally {
      // setLoading(false);
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      role,
      loading,
      profileLoading,
      isAnonymous,
      guestLoading,
      signInWithProvider,
      signInWithEmail,
      signInWithPhone,
      signInAnonymously,
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