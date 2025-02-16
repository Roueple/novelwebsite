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

    // Validate username format
    if (!/^[a-z0-9]+$/.test(username)) {
      setError('Username can only contain lowercase letters and numbers');
      setLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('No user found');
      }

      // Check if username exists
      const { data: existingUser } = await supabase
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
          role: 'reader'
        });

      if (profileError) throw profileError;

      // Redirect to home page
      router.push('/');
      router.refresh();
    } catch (err) {
      console.error('Error setting username:', err);
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
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  placeholder="Enter username"
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDark 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  required
                  pattern="[a-z0-9]+"
                  title="Only lowercase letters and numbers allowed"
                />
                {error && (
                  <p className="mt-2 text-sm text-red-500">
                    {error}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-2 px-4 rounded-lg bg-red-600 text-white 
                  hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed`}
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