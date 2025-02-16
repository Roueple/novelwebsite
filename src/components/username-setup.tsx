// src/components/username-setup.tsx
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/providers/theme-provider';
import { supabase } from '@/lib/supabase';

export default function UsernameSetup() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      if (!user) throw new Error('No user found');

      // Validate username format
      if (!/^[a-z][a-z0-9]*$/.test(username)) {
        setError('Username must start with a letter and can only contain lowercase letters and numbers');
        setLoading(false);
        return;
      }

      // Check if username exists
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username.toLowerCase())
        .single();

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
          username: username.toLowerCase(),
          email: user.email,
          role: 'reader',
          is_guest: false
        });

      if (profileError) {
        console.error('Profile error:', profileError);
        throw profileError;
      }

      // Success! Redirect to home
      router.push('/');
      router.refresh();

    } catch (err) {
      console.error('Error in username setup:', err);
      setError('Failed to set username. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <div className={`${
            isDark ? 'bg-gray-800' : 'bg-white'
          } rounded-lg shadow-lg p-6`}>
            <h1 className={`text-2xl font-bold mb-6 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              Choose Your Username
            </h1>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    const value = e.target.value.toLowerCase();
                    if (/^[a-z][a-z0-9]*$/.test(value) || value === '') {
                      setUsername(value);
                    }
                  }}
                  placeholder="Enter username"
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDark 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                  required
                  minLength={3}
                  maxLength={20}
                  pattern="^[a-z][a-z0-9]*$"
                />
                <p className={`mt-2 text-sm ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Username must start with a letter and can only contain lowercase letters and numbers.
                </p>
                {error && (
                  <p className="mt-2 text-sm text-red-500">
                    {error}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || username.length < 3}
                className={`w-full py-2 px-4 rounded-lg ${
                  loading || username.length < 3
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700'
                } text-white transition-colors`}
              >
                {loading ? 'Setting Username...' : 'Continue'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}