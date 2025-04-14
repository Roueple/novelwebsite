// src/components/reading/reading-header.tsx
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  Settings,
  Edit, // Keep for linking to edit page
  Sparkles,
  EyeOff,
  Moon,
  Sun,
  BookOpen,
  ChevronDown, // Icon for showing header
  ChevronUp // Icon for hiding header
} from 'lucide-react';
import { useTheme } from '@/providers/theme-provider';
import { NovelType, ChapterType } from '@/types/supabase';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ReadingHeaderProps {
  novel: NovelType;
  chapter: ChapterType;
  isAuthor: boolean; // To show edit button link
  visible: boolean;
  setVisible: (visible: boolean) => void;
  showSettingsMenu: boolean;
  setShowSettingsMenu: (show: boolean) => void;
  effectsEnabled: boolean; // For icon display
}

export default function ReadingHeader({
  novel,
  chapter,
  isAuthor,
  visible,
  setVisible,
  showSettingsMenu,
  setShowSettingsMenu,
  effectsEnabled,
}: ReadingHeaderProps) {
  const { theme, cycleTheme } = useTheme();
  const [isScrolledDown, setIsScrolledDown] = useState(false);
  const lastScrollY = useRef(0);

  // Auto-hide header logic
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Always show if at the top or settings menu is open
      if (currentScrollY <= 50 || showSettingsMenu) {
        setVisible(true);
        setIsScrolledDown(false); // Reset scroll direction state
      } else if (currentScrollY > lastScrollY.current + 10) { // Scrolling down
        setVisible(false);
        setIsScrolledDown(true);
      } else if (currentScrollY < lastScrollY.current - 10) { // Scrolling up
        setVisible(true);
        setIsScrolledDown(false);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [setVisible, showSettingsMenu]); // Re-add listener if setVisible or showSettingsMenu changes


  // Button to explicitly show header when hidden
  if (!visible && isScrolledDown) {
    return (
      <button
        onClick={() => setVisible(true)}
        className="fixed top-2 left-1/2 transform -translate-x-1/2 p-2 rounded-full bg-card bg-opacity-60 shadow-md text-foreground z-50 hover:bg-opacity-80 transition-opacity duration-300 animate-fade-in" // Added fade-in
        aria-label="Show Header"
      >
        <ChevronDown size={16} />
      </button>
    );
  }

  // Full header
  return (
    <header
      className={cn(
        "bg-background border-b border-border text-foreground sticky top-0 z-40 transition-transform duration-300 ease-in-out",
        !visible ? "-translate-y-full" : "translate-y-0" // Translate based on visibility
      )}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-2 md:py-3">
          {/* Left section - Back and Novel Info */}
          <div className="flex items-center gap-2 md:gap-4">
            <Link
              href={`/novels/${novel.id}`}
              className="p-1 md:p-2 rounded-lg hover:bg-accent"
              aria-label="Back to novel"
            >
              <ChevronLeft size={20} />
            </Link>

            <div className="hidden md:block overflow-hidden whitespace-nowrap">
              <h1 className="text-sm font-medium truncate max-w-[200px] lg:max-w-xs">
                {novel.title}
              </h1>
              <p className="text-xs text-muted-foreground">
                Chapter {chapter.chapter_number}
              </p>
            </div>
          </div>

          {/* Center - Reading Controls */}
          <div className="flex items-center gap-1 md:gap-2">
            {/* Theme toggler */}
            <Button
              variant="ghost"
              size="icon"
              onClick={cycleTheme}
              aria-label="Toggle theme"
              className="w-8 h-8"
            >
              {theme === 'light' ? (
                <Sun size={18} />
              ) : theme === 'dark' ? (
                <Moon size={18} />
              ) : (
                <BookOpen size={18} />
              )}
            </Button>

            {/* Effects toggle icon (non-functional, visual only) */}
            <Button
              variant="ghost"
              size="icon"
              disabled // It's toggled in the settings menu
              aria-label={effectsEnabled ? 'Text effects enabled' : 'Text effects disabled'}
              className={cn(
                "w-8 h-8",
                effectsEnabled ? 'text-yellow-500' : 'text-muted-foreground opacity-50'
              )}
            >
               <Sparkles size={18} />
            </Button>

            {/* Settings */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettingsMenu(!showSettingsMenu)}
              aria-label="Reading settings"
              className={cn(
                "w-8 h-8",
                showSettingsMenu ? 'bg-accent' : ''
              )}
            >
              <Settings size={18} />
            </Button>
          </div>

          {/* Right section - Author Edit Link & Hide Button */}
          <div className="flex items-center gap-1 md:gap-2">
            {isAuthor && (
              <Link href={`/novels/${novel.id}/chapter/${chapter.chapter_number}/edit`} passHref legacyBehavior>
                 <Button variant="outline" size="sm" className="gap-1 h-8 px-2">
                    <Edit size={16} />
                    <span className="hidden sm:inline">Edit</span>
                 </Button>
              </Link>
            )}
             {/* Hide Header Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setVisible(false)}
              aria-label="Hide header"
              className="w-8 h-8"
            >
              <ChevronUp size={18} />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}