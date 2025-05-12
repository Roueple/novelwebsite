// src/components/username-setup.tsx
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { toast } from 'sonner'; // Import toast for better feedback

export default function UsernameSetup() {
  const router = useRouter();
  const [username, setUsername] = useState(''); // This is for the unique handle
  const [displayName, setDisplayName] = useState(''); // New state for display name
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Prefill display name from user's auth metadata if available (e.g., from Google sign-up)
    // This is an enhancement, user can still change it.
    const fetchUserMetadata = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.user_metadata?.full_name && !displayName) {
            setDisplayName(user.user_metadata.full_name);
        }
        if (user?.email && !username && !user.user_metadata.full_name) { // Suggest username from email prefix if display name isn't obvious
            const emailPrefix = user.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').substring(0, 20);
            if (emailPrefix.length >=3 && /^[a-zA-Z]/.test(emailPrefix)) {
                setUsername(emailPrefix.toLowerCase());
            }
        }
    };
    fetchUserMetadata();
  }, []); // Empty dependency array, displayName is for prefill only

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const sanitizedUsername = username.trim().toLowerCase();
    const trimmedDisplayName = displayName.trim();

    if (!trimmedDisplayName) {
        setError('Display Name cannot be empty.');
        return;
    }
    if (!/^[a-zA-Z][a-zA-Z0-9_]{2,49}$/.test(sanitizedUsername)) {
      setError('Unique Username must start with a letter, be 3-50 characters, and contain only lowercase letters, numbers, or underscores.');
      return;
    }
    if (trimmedDisplayName.length > 50) {
        setError('Display Name cannot exceed 50 characters.');
        return;
    }

    setLoading(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw userError || new Error('User not found. Please log in again.');
      }

      // Check if unique username (handle) already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', sanitizedUsername)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 means 0 rows found (good)
        throw checkError;
      }

      if (existingUser) {
        setError('That Unique Username is already taken. Please choose another.');
        setLoading(false);
        return;
      }

      // Create profile with unique username and display name
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          username: sanitizedUsername, // Unique handle
          display_name: trimmedDisplayName, // Non-unique display name
          email: user.email, // Comes from auth.users, can be null
          role: 'reader', // Default role
          // is_guest: false, // REMOVED
          // vip_tier, comment_count will use DB defaults (0)
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        throw profileError;
      }

      toast.success("Profile setup complete! Redirecting...");
      // Force a refresh of the auth state to pick up the new profile
      // This often involves a full page reload or re-triggering onAuthStateChange
      // For now, push and AuthProvider should re-fetch on navigation if profile was null.
      await supabase.auth.refreshSession(); // Try to refresh to ensure AuthProvider fetches new profile
      router.push('/'); // Redirect to home or dashboard
      router.refresh(); // Next.js router refresh to ensure data is re-fetched on the target page

    } catch (err: any) {
      console.error('Error in username setup:', err);
      const message = err.message || 'Failed to set up profile. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="bg-card text-card-foreground rounded-lg shadow-xl p-6 sm:p-8">
          <h1 className="text-2xl font-bold mb-2 text-center text-foreground">
            Complete Your Profile
          </h1>
          <p className="text-center text-muted-foreground mb-6 text-sm">
            Choose your unique username (handle) and how your name will be displayed.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="display-name-input" className="block text-sm font-medium mb-1 text-foreground">
                Display Name <span className="text-destructive">*</span>
              </label>
              <Input
                id="display-name-input"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="E.g., John Doe"
                className="w-full"
                required
                maxLength={50}
                disabled={loading}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                This name will be shown on your comments. It can be changed later.
              </p>
            </div>

            <div>
              <label htmlFor="username-input" className="block text-sm font-medium mb-1 text-foreground">
                Unique Username (Handle) <span className="text-destructive">*</span>
              </label>
              <Input
                id="username-input"
                type="text"
                value={username}
                onChange={(e) => {
                  const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''); // Allow letters, numbers, underscore; enforce lowercase
                  if (value === '' || /^[a-z][a-z0-9_]*$/.test(value) || /^[a-z]$/.test(value)) {
                     if (value.length <= 50) setUsername(value);
                  }
                }}
                placeholder="E.g., johndoe123 (no spaces)"
                className="w-full"
                required
                minLength={3}
                maxLength={50}
                pattern="^[a-z][a-z0-9_]{2,49}$"
                disabled={loading}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                3-50 characters. Starts with a letter. Letters, numbers, underscores only. This is unique and cannot be easily changed.
              </p>
            </div>
            
            {error && (
              <p className="text-sm text-destructive text-center bg-destructive/10 p-2 rounded-md">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading || !username.trim() || !displayName.trim() || !/^[a-z][a-z0-9_]{2,49}$/.test(username.trim())}
              className="w-full"
            >
              {loading ? <LoadingSpinner className="mr-2" size="sm"/> : null}
              {loading ? 'Saving Profile...' : 'Save and Continue'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}