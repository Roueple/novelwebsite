// src/components/header.tsx
"use client";

import Link from 'next/link';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import LoginForm from './login-form';
import { Moon, Sun, User, BookOpen } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';

export default function Header() {
  const { theme, cycleTheme } = useTheme();
  const { user, role } = useAuth();
  const [username, setUsername] = useState<string | null>(null);

  const themeIcons = {
    light: <Sun size={20} />,
    dark: <Moon size={20} />,
    reading: <BookOpen size={20} />
  };
  
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
    <div className={`bg-crimson-900 text-white ${theme === 'dark' ? 'dark' : ''}`}>
      <header className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center">
              <Image 
                src={theme === 'dark' ? "/logo-dark.png" : "/logo-light.png"}
                alt="Your Brand"
                width={32}
                height={32}
                className="rounded-lg"
              />
            </div>
          </Link>

          <div className="flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-2 text-white">
                <User size={20} />
                <span>{username || 'Loading...'}</span>
                {role && (
                  <span className="px-2 py-1 text-sm rounded-full bg-crimson-800 text-white">
                    {role}
                  </span>
                )}
              </div>
            )}
            
            <button
              onClick={cycleTheme}
              className={`p-2 rounded-lg border ${
                theme === 'reading'
                  ? 'border-reading-accent hover:bg-reading-accent/10'
                  : theme === 'dark'
                  ? 'border-gray-700 hover:bg-gray-800'
                  : 'border-gray-200 hover:bg-gray-100'
              }`}
              aria-label="Toggle theme"
            >
              {themeIcons[theme]}
            </button>

            <LoginForm />
          </div>
        </div>
      </header>
    </div>
  );
}