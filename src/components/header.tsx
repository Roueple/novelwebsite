// src/components/header.tsx
"use client";

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import LoginForm from './login-form';
import { Moon, Sun, BookOpen, Search, Filter, Plus, User } from 'lucide-react';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function Header() {
  const router = useRouter();
  const { theme, cycleTheme } = useTheme();
  const { user, role } = useAuth();
  const [username, setUsername] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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
    // Navigate to search results page with query
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="bg-theme-background text-theme-foreground sticky top-0 z-50">
      <header className="container mx-auto px-4">
        <div className="flex flex-col">
          {/* Top Row */}
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <div className="w-36 h-36 flex items-center justify-center mr-2">
                <Image 
                  src={theme === 'dark' ? "/logo-dark.png" : "/logo-light.png"}
                  alt="Your Brand"
                  width={144}
                  height={144}
                  className="rounded-lg"
                />
              </div>
            </Link>

            <div className="flex items-center gap-4">
              {user && (
                <div className="flex items-center gap-2 text-theme-foreground">
                  <User size={20} />
                  <span>{username || 'Loading...'}</span>
                  {role && (
                    <span className="px-2 py-1 text-sm rounded-full bg-theme-accent text-white">
                      {role}
                    </span>
                  )}
                </div>
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

          {/* Search Row */}
          <div className="flex items-center gap-4 pb-4">
            <form onSubmit={handleSearch} className="flex-1 relative">
              <input
                type="text"
                placeholder="Search novels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 pr-10 rounded-lg border bg-theme-input border-theme-border text-theme-foreground placeholder-theme-muted focus:outline-none focus:border-red-500"
              />
              <button 
                type="submit" 
                className="absolute right-3 top-2.5 text-theme-muted"
              >
                <Search size={20} />
              </button>
            </form>

            <button 
              className="p-2 rounded-lg border border-theme-border hover:bg-theme-hover"
              aria-label="Filter"
            >
              <Filter size={20} className="text-theme-muted" />
            </button>

            {(role === 'admin' || role === 'author') && (
              <Link
                href="/novels/create"
                className="p-2 rounded-lg border border-theme-border hover:bg-theme-hover flex items-center gap-2 text-theme-foreground"
              >
                <Plus size={20} />
                <span>Add Novel</span>
              </Link>
            )}
          </div>
        </div>
      </header>
    </div>
  );
}