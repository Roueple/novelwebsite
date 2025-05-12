// src/components/header.tsx
"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react'; // Keep useEffect for other potential uses, or remove if not needed
import { useAuth } from '@/providers/auth-provider'; // Corrected: Profile is now part of useAuth
import { useTheme } from '@/providers/theme-provider';
import { usePathname, useRouter } from 'next/navigation';
import LoginForm from './login-form'; // Handles Login/Logout
import { Moon, Sun, BookOpen, Search, Plus, UserCheck, Library } from 'lucide-react'; // Added Library for placeholder
// Removed supabase client import, as profile data comes from useAuth
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
// Removed Dialog components as the Register/Link dialog is removed
import LoadingSpinner from '@/components/ui/loading-spinner';
// Removed toast from here as register/link specific toasts are gone

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, cycleTheme } = useTheme();
  // Updated destructuring from useAuth: removed isAnonymous, guestLoading
  // Added profile to get display name
  const { user, role, loading, profile, signInWithProvider, signInWithEmail } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  // Removed local username state and showRegisterModal state
  // const [username, setUsername] = useState<string | null>(null);
  // const [showRegisterModal, setShowRegisterModal] = useState(false);

  const isChapterRoute = pathname?.includes('/chapter/');

  // Removed useEffect for fetchUsername, as profile info comes from useAuth()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery) {
      router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`);
      setSearchQuery(''); // Clear search after execution
    }
  };

  // Removed handleRegisterWithGoogle and handleRegisterWithEmailPrompt
  // Sign-up will now be handled by components like ChapterComments or a dedicated signup page/modal

  if (isChapterRoute) return null; // Don't show header on chapter reading routes

  // Determine what name to display for the logged-in user
  const userDisplayName = profile?.display_name || profile?.username || (user ? 'User' : null);

  return (
    <>
      <div className="bg-background text-foreground border-b border-border">
        <header className="container mx-auto px-4">
          <div className="flex items-center justify-between space-x-2 md:space-x-4 py-2 md:py-3">
            {/* Logo */}
            <Link href="/" className="flex-shrink-0">
              <Image
                src={theme === 'dark' ? "/logo-dark.png" : "/logo-light.png"}
                alt="Roueple Novel Website Logo" // Changed alt text slightly
                width={120}
                height={30} // Consistent height
                className="h-auto object-contain" // Max height can be controlled by parent if needed
                priority
              />
            </Link>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="flex-grow max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg mx-2 relative">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search novels..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  // onFocus and onBlur can be kept if specific styling is desired for focus
                  className={cn(
                    "w-full h-9 pl-10 pr-4 py-2 rounded-lg border text-sm",
                    "bg-input border-border text-foreground placeholder-muted-foreground",
                    "focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  )}
                  aria-label="Search novels"
                />
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" aria-hidden="true" />
              </div>
            </form>

            {/* Action Buttons */}
            <div className="flex items-center flex-shrink-0 space-x-1 md:space-x-2">
              {role === 'admin' && (
                <Link href="/novels/create" passHref legacyBehavior>
                  <Button variant="ghost" size="icon" aria-label="Add New Novel">
                    <Plus size={20} />
                  </Button>
                </Link>
              )}

              <Button variant="ghost" size="icon" onClick={cycleTheme} aria-label={`Toggle theme to ${theme === 'light' ? 'dark' : theme === 'dark' ? 'reading' : 'light'}`}>
                {theme === 'light' ? <Sun size={20} /> : theme === 'dark' ? <Moon size={20} /> : <BookOpen size={20} />}
              </Button>

              {/* Login/User Info */}
              {loading ? (
                <LoadingSpinner size="sm" />
              ) : user && profile ? ( // Check for both user and profile
                <div className="flex items-center gap-2 text-sm">
                  {/* Display user's name from profile */}
                  <span className="hidden sm:inline font-medium truncate max-w-[100px] lg:max-w-[150px]" title={userDisplayName ?? undefined}>
                    {userDisplayName}
                  </span>
                  <LoginForm /> {/* Handles Logout */}
                </div>
              ) : user && !profile && !loading ? ( // User authenticated but profile still loading or not yet created
                <div className="flex items-center gap-2 text-sm">
                    <span className="hidden sm:inline font-medium text-muted-foreground">Finalizing...</span>
                    <LoadingSpinner size="sm" /> {/* Or a link to profile setup if stuck here */}
                </div>
              ) : (
                <LoginForm /> // Handles Login (will show Login button)
              )}
            </div>
          </div>
        </header>
      </div>
    </>
  );
}