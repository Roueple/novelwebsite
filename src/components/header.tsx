// src/components/header.tsx
"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { usePathname, useRouter } from 'next/navigation'; // Import useRouter
import LoginForm from './login-form';
import { Moon, Sun, BookOpen, Search, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import { cn } from '@/lib/utils'; // Import cn

export default function Header() {
  const router = useRouter(); // Use router for navigation
  const pathname = usePathname();
  const { theme, cycleTheme } = useTheme();
  const { user, role } = useAuth();
  const [username, setUsername] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Determine if the current route is any chapter-related page (read or edit)
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
        const { data, error } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();
        if (!error && data) setUsername(data.username);
        else if (error) console.error("Error fetching username:", error.message);
      } else {
        setUsername(null); // Reset username if user logs out
      }
    }
    fetchUsername();
  }, [user]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery(''); // Clear search input after navigation
    }
  };

  // ----> Conditional Rendering: Do not render header on chapter routes <----
  if (isChapterRoute) {
    return null;
  }

  // Render the normal header for all other pages
  return (
    <div className="bg-background text-foreground border-b border-border sticky top-0 z-50">
      <header className="container mx-auto px-4">
        <div className="flex items-center justify-between space-x-2 md:space-x-4 py-2 md:py-3">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
             {/* Simple Text Logo - Replace with Image if preferred */}
             <span className="text-xl font-bold text-primary">NovelSite</span>
            {/* <Image
              src={theme === 'dark' ? "/logo-dark.png" : "/logo-light.png"}
              alt="Your Brand"
              width={120} // Adjust size as needed
              height={30} // Adjust size as needed
              className="h-auto" // Maintain aspect ratio
              priority
            /> */}
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
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 150)} // Delay allows clicking search button
                className={cn(
                  "w-full h-9 pl-10 pr-4 py-2 rounded-lg border text-sm",
                  "bg-input border-border text-foreground placeholder-muted-foreground",
                  "focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary" // Use primary color for focus ring
                )}
              />
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
               {/* Consider adding a clear button inside the input when focused/has text */}
            </div>
          </form>

          {/* Action Buttons */}
          <div className="flex items-center flex-shrink-0 space-x-1 md:space-x-2">
            {/* Add Novel Button (Admin/Author) */}
            {(role === 'admin' || role === 'author') && (
              <Link href="/novels/create" passHref legacyBehavior>
                <Button variant="ghost" size="icon" aria-label="Add Novel">
                  <Plus size={20} />
                </Button>
              </Link>
            )}

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={cycleTheme}
              aria-label="Toggle theme"
            >
              {themeIcons[theme]}
            </Button>

            {/* Login/User Info */}
            {user ? (
                 <div className="flex items-center gap-2 text-sm">
                    <span className="hidden sm:inline font-medium truncate max-w-[100px]">{username || user.email?.split('@')[0]}</span>
                     {/* Simple Logout Button - Consider a Dropdown Menu for Profile/Settings */}
                     <LoginForm />
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