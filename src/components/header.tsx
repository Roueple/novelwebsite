// src/components/header.tsx
"use client";

import Link from 'next/link';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import LoginForm from './login-form';
import { Moon, Sun, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const { user, role } = useAuth();
  const isDark = theme === 'dark';
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUsername() {
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();

        if (!error && data) {
          setUsername(data.username);
        }
      }
    }

    fetchUsername();
  }, [user]);

  return (
    <header className="container mx-auto px-4 py-4">
      <div className="flex justify-between items-center">
        <Link href="/" className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Canon Story
        </Link>

        <div className="flex items-center gap-4">
          {user && (
            <div className={`flex items-center gap-2 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
              <User size={20} />
              <span>{username || 'Loading...'}</span>
              {role && (
                <span className={`px-2 py-1 text-sm rounded-full ${
                  isDark 
                    ? 'bg-gray-700 text-gray-200' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {role}
                </span>
              )}
            </div>
          )}
          
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg border ${
              isDark 
                ? 'border-gray-600 hover:bg-gray-700 text-yellow-400' 
                : 'border-gray-300 hover:bg-gray-50 text-gray-600'
            }`}
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <LoginForm />
        </div>
      </div>
    </header>
  );
}