"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import { UserRole } from '@/types/supabase'; // Import UserRole from your types

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isCreator: boolean | null; // Added isCreator field
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
  const [isCreator, setIsCreator] = useState<boolean | null>(null); // State for isCreator
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRoleAndCreatorStatus(session.user.id); // Fetch both role and is_creator
      } else {
         setRole(null);
         setIsCreator(null);
      }
      setLoading(false); // Set loading to false after initial check
    });

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRoleAndCreatorStatus(session.user.id); // Fetch both on state change
      } else {
        setRole(null);
        setIsCreator(null);
      }
      // setLoading(false); // No need to set loading false here, initial check handles it
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchUserRoleAndCreatorStatus(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      // Select both role and is_creator
      .select('role, is_creator')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user role and creator status:', error);
      setRole(null);
      setIsCreator(null);
      return;
    }

    setRole(data?.role ?? null); // Set role, default to null if data is null
    setIsCreator(data?.is_creator ?? false); // Set isCreator, default to false if data is null
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
    const adjectives = ['Happy', 'Lucky', 'Brave', 'Wise', 'Cool', 'Swift'];
    const objects = ['Tiger', 'Dragon', 'Eagle', 'Panda', 'Wolf', 'Lion'];
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const username = `${adjectives[Math.floor(Math.random() * adjectives.length)]}${
      objects[Math.floor(Math.random() * objects.length)]
    }${randomNum}`;

    const { data: { user }, error } = await supabase.auth.signUp({
      email: `${username.toLowerCase()}@guest.novelwebsite.com`,
      password: crypto.randomUUID(),
    });

    if (error) throw error;

    if (user) {
      await supabase.from('profiles').insert({
        id: user.id,
        username,
        role: 'reader', // Guests are readers
        is_creator: false, // Guests are not creators
        is_guest: true
      });
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  return (
    <AuthContext.Provider value={{
      user,
      role,
      isCreator, // Expose isCreator
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
