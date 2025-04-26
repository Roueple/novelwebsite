// src/components/header.tsx
"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
// Import isAnonymous and signInWithProvider
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { usePathname, useRouter } from 'next/navigation';
import LoginForm from './login-form';
import { Moon, Sun, BookOpen, Search, Plus, UserCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
    DialogDescription, DialogFooter, DialogTrigger, DialogClose
} from "@/components/ui/dialog";
import { FcGoogle } from 'react-icons/fc';
import { HiMail } from 'react-icons/hi';
import LoadingSpinner from '@/components/ui/loading-spinner'; // Import LoadingSpinner
import { toast } from 'sonner'; // Import toast


export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, cycleTheme } = useTheme();
  // Get isAnonymous, signInWithProvider, signInWithEmail, guestLoading
  const { user, role, loading, isAnonymous, signInWithProvider, signInWithEmail, guestLoading } = useAuth();
  const [username, setUsername] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  const isChapterRoute = pathname?.includes('/chapter/');

  useEffect(() => {
    async function fetchUsername() {
      if (user) {
        try {
            // Fetch username AND is_guest status from profile
            const { data, error } = await supabase
            .from('profiles')
            .select('username, is_guest') // Fetch both
            .eq('id', user.id)
            .single();

            if (error && error.code !== 'PGRST116') throw error;

            // Use anon# format if profile indicates guest, otherwise use stored username
            if (data?.is_guest) {
                setUsername(data.username || `anon#${user.id.substring(0,6)}`); // Display stored anon name
            } else {
                 setUsername(data?.username ?? null); // Display regular username
            }

        } catch (error: any) {
             console.error("Error fetching username/profile:", error.message);
             setUsername(null);
        }
      } else {
        setUsername(null);
      }
    }
    if (!loading && user) {
        fetchUsername();
    } else if (!loading && !user) {
        setUsername(null);
    }
  }, [user, loading]); // Depend on user and loading

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery) {
      router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`);
      setSearchQuery('');
    }
  };

  // --- Registration Handlers (Now call linking functions) ---
  const handleRegisterWithGoogle = async () => {
      setShowRegisterModal(false);
      // This will now either sign in or link the anonymous account
      await signInWithProvider('google');
  }

  const handleRegisterWithEmailPrompt = async () => {
      setShowRegisterModal(false);
      const email = prompt("Please enter your email address to register or sign in:");
      if (email) {
         // This will now either sign in or link the anonymous account
         await signInWithEmail(email);
      } else {
          toast.info("Email registration cancelled.");
      }
  }
  // --- End Registration Handlers ---


  if (isChapterRoute) return null;

  return (
    <>
      <div className="bg-background text-foreground border-b border-border">
        <header className="container mx-auto px-4">
          <div className="flex items-center justify-between space-x-2 md:space-x-4 py-2 md:py-3">
            {/* Logo */}
            <Link href="/" className="flex-shrink-0">
              <Image
                src={theme === 'dark' ? "/logo-dark.png" : "/logo-light.png"}
                alt="NovelWebsite Logo"
                width={120} height={30}
                className="h-auto object-contain" priority
              />
            </Link>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="flex-grow max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg mx-2 relative">
              {/* ... input ... */}
               <div className="relative">
                <input
                  type="text" placeholder="Search novels..." value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsSearchFocused(false), 150)}
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
                  <Button variant="ghost" size="icon" aria-label="Add New Novel"> <Plus size={20} /> </Button>
                </Link>
              )}

              <Button variant="ghost" size="icon" onClick={cycleTheme} aria-label={`Toggle theme`}>
                {theme === 'light' ? <Sun size={20} /> : theme === 'dark' ? <Moon size={20} /> : <BookOpen size={20} />}
              </Button>

              {/* Login/User Info/Register Prompt */}
              {loading ? (
                  <LoadingSpinner size="sm" />
              ) : user ? (
                   <div className="flex items-center gap-2 text-sm">
                      {/* Show Register Button if user is anonymous */}
                      {isAnonymous && ( // Use isAnonymous state
                          <Dialog open={showRegisterModal} onOpenChange={setShowRegisterModal}>
                              <DialogTrigger asChild>
                                  <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-primary/10">
                                      <UserCheck size={16} className="mr-1" />
                                      Register / Link
                                  </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-[425px]">
                                  <DialogHeader>
                                  <DialogTitle>Register or Sign In</DialogTitle>
                                  <DialogDescription>
                                      Link your guest activity to a permanent account using Google or Email.
                                  </DialogDescription>
                                  </DialogHeader>
                                  <div className="grid gap-4 py-4">
                                      {/* Updated handlers */}
                                      <Button onClick={handleRegisterWithGoogle} variant="outline" disabled={guestLoading}>
                                          <FcGoogle className="mr-2 h-4 w-4" /> Continue with Google
                                      </Button>
                                      <Button onClick={handleRegisterWithEmailPrompt} variant="outline" disabled={guestLoading}>
                                          <HiMail className="mr-2 h-4 w-4" /> Continue with Email
                                      </Button>
                                  </div>
                                  <DialogFooter>
                                      <DialogClose asChild>
                                          <Button type="button" variant="secondary">
                                              Cancel
                                          </Button>
                                      </DialogClose>
                                  </DialogFooter>
                              </DialogContent>
                          </Dialog>
                      )}
                      {/* Display username (anon# or registered) */}
                      <span className="hidden sm:inline font-medium truncate max-w-[100px]" title={username ?? 'User'}>
                          {username || 'User'} {/* Display fetched username */}
                      </span>
                       <LoginForm /> {/* Handles Logout */}
                   </div>
              ) : (
                  <LoginForm /> // Handles Login
              )}
            </div>
          </div>
        </header>
      </div>
    </>
  );
}
