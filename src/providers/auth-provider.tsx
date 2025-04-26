// src/providers/auth-provider.tsx
"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import { UserRole } from '@/types/supabase';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  loading: boolean;
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRole(session.user.id);
      } else {
         setRole(null);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRole(session.user.id);
      } else {
        setRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchUserRole(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // Ignore not found error during fetch
      console.error('Error fetching user role:', error);
      setRole(null); // Set role to null on error
      return;
    }
    // If profile doesn't exist yet (e.g., right after guest signup), role will be null
    setRole(data?.role ?? null);
  }


  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
    if (error) throw error;
  }

  async function signInWithEmail(email: string) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });
    if (error) throw error;
  }

  async function signInWithPhone(phone: string) {
    const { error } = await supabase.auth.signInWithOtp({
      phone,
    });
    if (error) throw error;
  }

  async function signInAsGuest() {
    setLoading(true); // Indicate loading during guest creation
    try {
        // Generate the anon username
        const randomNum = Math.floor(1000 + Math.random() * 900000); // 4 to 6 digits
        const username = `anon#${randomNum}`;
        const tempEmail = `${username}@guest.novelwebsite.com`; // Use anon name for temp email
        const tempPassword = crypto.randomUUID(); // Secure random password

        // Sign up the guest user with Supabase Auth
        const { data: { user }, error: signUpError } = await supabase.auth.signUp({
            email: tempEmail,
            password: tempPassword,
        });

        if (signUpError) {
            // Handle potential errors like email rate limits if testing heavily
            console.error("Guest signup error:", signUpError);
            throw new Error(`Failed to create guest account: ${signUpError.message}`);
        }

        if (!user) {
            throw new Error("Guest user creation failed in Supabase Auth.");
        }

        // Insert the profile immediately after successful auth signup
        const { error: profileError } = await supabase.from('profiles').insert({
            id: user.id,
            username: username, // Store the generated anon# username
            role: 'reader',
            is_guest: true
        });

        if (profileError) {
            // If profile insert fails, maybe try to clean up the auth user? (More complex)
            console.error("Guest profile creation error:", profileError);
            // Attempt to sign out the partially created user to avoid confusion
            await supabase.auth.signOut().catch(e => console.error("Error signing out failed guest:", e));
            throw new Error(`Failed to save guest profile: ${profileError.message}`);
        }

        // Manually set user and role state after successful profile creation
        // This ensures the UI updates correctly without waiting for onAuthStateChange
        setUser(user);
        setRole('reader');

    } catch (error) {
        console.error("Error in signInAsGuest:", error);
        // Provide feedback to the user
        alert(error instanceof Error ? error.message : "Failed to sign in as guest.");
        // Reset state if necessary
        setUser(null);
        setRole(null);
    } finally {
        setLoading(false); // Stop loading indicator
    }
}


  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    // State updates (user=null, role=null) are handled by onAuthStateChange
  }

  return (
    <AuthContext.Provider value={{
      user,
      role,
      loading,
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
