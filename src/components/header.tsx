// src/components/header.tsx
"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider'; // Keep useTheme here for logo path logic if needed
import { usePathname, useRouter } from 'next/navigation';
import LoginForm from './login-form';
import { Moon, Sun, BookOpen, Search, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Image from 'next/image'; // Make sure Image is imported
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, cycleTheme } = useTheme(); // Keep theme access if logo depends on it
  // Destructure isCreator from useAuth
  const { user, role, isCreator } = useAuth();
  const [username, setUsername] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Determine if the current route is any chapter-related page
  const isChapterRoute = pathname?.includes('/chapter/');

  // Theme icons mapping
  const themeIcons = {
    light: <Sun size={20} />,
    dark: <Moon size={20} />,
    reading: <BookOpen size={20} />
  };

  // Fetch username
  useEffect(() => {
    async function fetchUsername() {
      if (user) {
        try { // Add try-catch for robustness
            const { data, error } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', user.id)
            .single();
            if (error && error.code !== 'PGRST116') throw error; // Ignore not found, throw others
            setUsername(data?.username ?? null);
        } catch (error: any) {
             console.error("Error fetching username:", error.message);
             setUsername(null); // Reset on error
        }
      } else {
        setUsername(null);
      }
    }
    fetchUsername();
  }, [user]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery) {
      router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`);
      setSearchQuery(''); // Clear search input after navigation
    }
  };

  // ----> Conditional Rendering: Do not render header on chapter routes <----
  if (isChapterRoute) {
    return null;
  }

  // ----> REMOVE sticky top-0 z-50 from the main container div <----
  return (
    <div className="bg-background text-foreground border-b border-border"> {/* Removed sticky classes */}
      <header className="container mx-auto px-4">
        <div className="flex items-center justify-between space-x-2 md:space-x-4 py-2 md:py-3">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
             {/* ----> RESTORED/ADJUSTED LOGO <---- */}
             {/* Option 1: Simple Text Logo (Uncomment if preferred) */}
             {/* <span className="text-xl font-bold text-primary">NovelSite</span> */}

             {/* Option 2: Image Logo (Adjust path/theme logic as needed) */}
             {/* Example: Assumes you have logo-light.png and logo-dark.png in public folder */}
            <Image
              // Dynamically set the src based on the theme if your logos are theme-specific
              src={theme === 'dark' ? "/logo-dark.png" : "/logo-light.png"}
              // Fallback if theme isn't ready or logo is theme-independent:
              // src="/logo.png"
              alt="NovelWebsite Logo" // Descriptive alt text
              width={120} // Adjust desired width
              height={30} // Adjust desired height
              className="h-auto object-contain" // Maintain aspect ratio, ensure it fits
              priority // Load logo quickly
            />
          </Link>

          {/* Search Bar */}
          <form
            onSubmit={handleSearch}
            className="flex-grow max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg mx-2 relative"
          >
            <div className="relative">
              <input
                type="text"
                placeholder="Search novels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 150)}
                className={cn(
                  "w-full h-9 pl-10 pr-4 py-2 rounded-lg border text-sm",
                  "bg-input border-border text-foreground placeholder-muted-foreground",
                  "focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                )}
                aria-label="Search novels" // Added aria-label
              />
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                aria-hidden="true" // Hide decorative icon from screen readers
              />
            </div>
          </form>

          {/* Action Buttons */}
          <div className="flex items-center flex-shrink-0 space-x-1 md:space-x-2">
            {/* Add Novel Button (Admin/Creator) */}
            {/* Show if role is admin OR if user is marked as a creator */}
            {(role === 'admin' || isCreator) && (
              <Link href="/novels/create" passHref legacyBehavior>
                <Button variant="ghost" size="icon" aria-label="Add New Novel">
                  <Plus size={20} />
                </Button>
              </Link>
            )}

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={cycleTheme}
              aria-label={`Toggle theme to ${theme === 'light' ? 'dark' : theme === 'dark' ? 'reading' : 'light'}`} // More descriptive aria-label
            >
              {theme === 'light' ? <Sun size={20} /> : theme === 'dark' ? <Moon size={20} /> : <BookOpen size={20} />}
            </Button>

            {/* Login/User Info */}
            {user ? (
                 <div className="flex items-center gap-2 text-sm">
                    <span className="hidden sm:inline font-medium truncate max-w-[100px]">{username || user.email?.split('@')[0]}</span>
                     <LoginForm /> {/* LoginForm handles logout */}
                 </div>
            ) : (
                <LoginForm />
            )}
          </div>
        </div>
      </header>
    </div>
  );
}
