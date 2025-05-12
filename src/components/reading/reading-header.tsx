// src/components/reading/reading-header.tsx
import React from 'react';
import Link from 'next/link';
import Image from 'next/image'; // Import Image
import {
  Settings, Edit, Sparkles, Moon, Sun, BookOpen, ChevronUp, Library, // Use Library icon as placeholder
} from 'lucide-react';
import { useTheme } from '@/providers/theme-provider';
import { Novel, Chapter } from '@/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ReadingHeaderProps {
  novel: Novel | null; // Allow null
  chapter: Chapter | null; // Allow null
  isAuthor: boolean;
  visible: boolean;
  setVisible: (visible: boolean) => void;
  showSettingsMenu: boolean;
  setShowSettingsMenu: (show: boolean) => void;
  effectsEnabled: boolean;
}

// Skeleton Component (Remains the same)
function ReadingHeaderSkeleton() {
  return (
    <header className="bg-background border-b border-border text-foreground w-full z-40 fixed top-0 left-0 animate-pulse">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-2 md:py-3">
          {/* Left Skeleton */}
          <div className="flex items-center gap-2 md:gap-4 flex-shrink-0 min-w-0">
            {/* Skeleton for Cover Image Link */}
            <div className="h-8 w-8 md:h-10 md:w-10 bg-muted rounded-md flex-shrink-0"></div>
            <div className="hidden md:flex flex-col space-y-1.5">
              <div className="h-4 w-32 bg-muted rounded"></div>
              <div className="h-3 w-48 bg-muted rounded"></div>
            </div>
          </div>
          {/* Right Skeleton (No change) */}
          <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
            <div className="h-8 w-8 bg-muted rounded-full"></div>
            <div className="h-8 w-8 bg-muted rounded-full"></div>
            <div className="h-8 w-8 bg-muted rounded-full"></div>
            <div className="h-8 w-16 bg-muted rounded-md hidden sm:block"></div>
            <div className="h-8 w-8 bg-muted rounded-full"></div>
          </div>
        </div>
      </div>
    </header>
  );
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

  if (!visible) {
    return null;
  }

  // Render skeleton if data is missing
  if (!novel || !chapter) {
    return <ReadingHeaderSkeleton />;
  }

  // Render actual header if data exists
  return (
    <header
        // Added reading-header-container class for potential focus mode targeting
        className="reading-header-container bg-background/95 backdrop-blur-sm border-b border-border text-foreground w-full z-40 fixed top-0 left-0 transition-opacity duration-300 ease-in-out"
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-2 md:py-3">
          {/* Left section - MODIFIED */}
          <div className="flex items-center gap-2 md:gap-4 flex-shrink-0 min-w-0">
            {/* Novel Cover Link */}
            <Link
              href={`/novels/${novel.id}`}
              className="flex-shrink-0 block w-8 h-8 md:w-10 md:h-10 rounded-md overflow-hidden hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              aria-label={`Back to novel ${novel.title}`}
              title={`Back to ${novel.title}`}
            >
              {novel.cover_url ? (
                <Image
                  src={novel.cover_url}
                  alt={`Cover for ${novel.title}`}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                  // Consider adding placeholder/blurDataURL if available globally
                  // placeholder="blur"
                  // blurDataURL={novel.cover_blur || '/placeholder-cover-blur.png'}
                />
              ) : (
                // Placeholder Icon if no cover
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Library size={18} className="text-muted-foreground" />
                </div>
              )}
            </Link>
            {/* Chapter Info (no change) */}
            <div className="hidden md:block overflow-hidden whitespace-nowrap min-w-0">
              <h1 className="text-sm font-medium truncate max-w-[200px] lg:max-w-xs">
                {novel.title}
              </h1>
              <p className="text-xs text-muted-foreground truncate">
                Chapter {chapter.chapter_number}: {chapter.title}
              </p>
            </div>
          </div>

           {/* Center - Spacer (no change) */}
           <div className="flex-grow"></div>

           {/* Right section - Controls (no change from previous implementation) */}
          <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
             <Button variant="ghost" size="icon" onClick={cycleTheme} aria-label="Toggle theme" className="w-8 h-8">
              {theme === 'light' ? <Sun size={18} /> : theme === 'dark' ? <Moon size={18} /> : <BookOpen size={18} />}
            </Button>
             <Button variant="ghost" size="icon" disabled aria-label={effectsEnabled ? 'Text effects enabled' : 'Text effects disabled'}
              className={cn("w-8 h-8", effectsEnabled ? 'text-yellow-500' : 'text-muted-foreground opacity-50')}>
               <Sparkles size={18} />
            </Button>
             <Button variant="ghost" size="icon" onClick={() => setShowSettingsMenu(!showSettingsMenu)} aria-label="Reading settings"
              className={cn("w-8 h-8", showSettingsMenu ? 'bg-accent' : '')}>
              <Settings size={18} />
            </Button>
            {isAuthor && (
              <Link href={`/novels/${novel.id}/chapter/${chapter.chapter_number}/edit`} passHref legacyBehavior>
                 <Button variant="outline" size="sm" className="gap-1 h-8 px-2">
                    <Edit size={16} />
                    <span className="hidden sm:inline">Edit</span>
                 </Button>
              </Link>
            )}
            <Button variant="ghost" size="icon" onClick={() => setVisible(false)} aria-label="Hide header" className="w-8 h-8">
              <ChevronUp size={18} />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}