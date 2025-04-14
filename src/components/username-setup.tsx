"use client";

import { useState, useEffect } from 'react'; // Keep useEffect if needed
import { useRouter } from 'next/navigation';
// import { useTheme } from '@/providers/theme-provider'; // REMOVE
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';   // Use shadcn Input
import { Button } from '@/components/ui/button'; // Use shadcn Button
import LoadingSpinner from '@/components/ui/loading-spinner'; // Use Spinner

export default function UsernameSetup() {
  const router = useRouter();
  // const { theme } = useTheme(); // REMOVE
  // const isDark = theme === 'dark'; // REMOVE

  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false); // Keep mount check if needed for other client logic

   useEffect(() => {
       setIsMounted(true);
   }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error('No user found');

      // Validate username format
      const sanitizedUsername = username.trim().toLowerCase();
      if (!/^[a-z][a-z0-9_]{2,19}$/.test(sanitizedUsername)) { // Allow underscore, adjust length
          setError('Username must start with a letter, be 3-20 characters long, and contain only lowercase letters, numbers, or underscores.');
          setLoading(false);
          return;
      }


      // Check if username exists
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', sanitizedUsername) // Use sanitized username
        .maybeSingle(); // Use maybeSingle to handle non-existent user gracefully

      if (checkError && checkError.code !== 'PGRST116') { // Ignore 'PGRST116' (Row not found)
          throw checkError;
      }

      if (existingUser) {
        setError('Username already taken');
        setLoading(false);
        return;
      }

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          username: sanitizedUsername, // Use sanitized username
          email: user.email, // Email might be null for phone signup
          role: 'reader',
          is_guest: false // Assuming this is for non-guest setup
        });

      if (profileError) {
        console.error('Profile error:', profileError);
        throw profileError;
      }

      // Success! Redirect to home and refresh page state
      router.push('/');
      // router.refresh(); // Consider if refresh is truly needed, might cause flashes

    } catch (err: any) {
      console.error('Error in username setup:', err);
       const message = err.message || 'Failed to set username. Please try again.';
      setError(message);
      // Optionally, provide more specific user feedback based on error code if available
    } finally {
      setLoading(false);
    }
  };

   // Render loading or null before mount if there's other client logic depending on it
   if (!isMounted) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <LoadingSpinner size="lg" />
            </div>
        );
   }

  return (
    // Use theme-aware classes directly
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          {/* Use theme-aware classes for card */}
          <div className="bg-card text-card-foreground rounded-lg shadow-lg p-6">
            <h1 className="text-2xl font-bold mb-6 text-foreground">
              Choose Your Username
            </h1>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="username-input" className="block text-sm font-medium mb-2 text-foreground">
                  Username
                </label>
                <Input // Use shadcn Input
                  id="username-input"
                  type="text"
                  value={username}
                  onChange={(e) => {
                    // Allow letters, numbers, underscore; enforce lowercase start
                    const value = e.target.value.toLowerCase();
                    if (/^[a-z][a-z0-9_]*$/.test(value) || value === '' || /^[a-z]$/.test(value)) {
                       setUsername(value);
                    }
                  }}
                  placeholder="Enter username"
                  className="w-full" // Input handles theme styles
                  required
                  minLength={3}
                  maxLength={20}
                  pattern="^[a-z][a-z0-9_]{2,19}$" // Update pattern for validation message consistency
                  disabled={loading}
                />
                <p className="mt-2 text-sm text-muted-foreground">
                  3-20 characters. Starts with a letter. Letters, numbers, underscores only.
                </p>
                {error && (
                  <p className="mt-2 text-sm text-red-500">
                    {error}
                  </p>
                )}
              </div>

              <Button // Use shadcn Button
                type="submit"
                disabled={loading || username.length < 3 || !/^[a-z][a-z0-9_]{2,19}$/.test(username)} // Add pattern check to disable
                className="w-full" // Use primary styling from Button variant
              >
                {loading ? <LoadingSpinner className="mr-2" size="sm"/> : null}
                {loading ? 'Setting Username...' : 'Continue'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}