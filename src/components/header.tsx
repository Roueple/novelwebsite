// src/components/header.tsx
"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import LoginForm from './login-form';
import { Moon, Sun, BookOpen, Search, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function Header() {
  const router = useRouter();
  const { theme, cycleTheme } = useTheme();
  const { user, role } = useAuth();
  const [username, setUsername] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="bg-theme-background text-theme-foreground sticky top-0 z-50">
      <header className="container mx-auto px-4">
        <div className="flex items-center justify-between space-x-4 py-3">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <Image 
              src={theme === 'dark' ? "/logo-dark.png" : "/logo-light.png"}
              alt="Your Brand"
              width={144}
              height={144}
              className="rounded-lg"
            />
          </Link>

          {/* Search Bar */}
          <form 
            onSubmit={handleSearch} 
            className={`flex-grow max-w-xl mx-4 relative transition-all duration-300 ${
              isSearchFocused ? 'w-full' : 'w-64'
            }`}
          >
            <div className="relative">
              <input
                type="text"
                placeholder="Search novels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                className="w-full px-3 py-2 pl-10 rounded-lg border bg-theme-input border-theme-border text-theme-foreground placeholder-theme-muted focus:outline-none focus:border-red-500 transition-all duration-300"
              />
              <Search 
                size={20} 
                className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted"
              />
            </div>
          </form>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            {user && (
              <div className="flex items-center gap-2 text-theme-foreground mr-2">
                <span>{username || 'Loading...'}</span>
                {role && (
                  <span className="px-2 py-1 text-sm rounded-full bg-theme-accent text-white">
                    {role}
                  </span>
                )}
              </div>
            )}

            {(role === 'admin' || role === 'author') && (
              <Link
                href="/novels/create"
                className="p-2 rounded-lg border border-theme-border hover:bg-theme-hover flex items-center"
                aria-label="Add Novel"
              >
                <Plus size={20} className="text-theme-foreground" />
              </Link>
            )}

            <button
              onClick={cycleTheme}
              className="p-2 rounded-lg border border-theme-border hover:bg-theme-hover"
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