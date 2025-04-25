// src/components/reading/reading-header.tsx
import React from 'react';
import Link from 'next/link';
import {
  ChevronLeft, Settings, Edit, Sparkles, Moon, Sun, BookOpen, ChevronUp,
} from 'lucide-react';
import { useTheme } from '@/providers/theme-provider';
// *** CORRECT: Uses Novel type ***
import { Novel, ChapterType } from '@/types/supabase';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ReadingHeaderProps {
  // *** CORRECT: novel prop type is Novel ***
  novel: Novel;
  chapter: ChapterType;
  isAuthor: boolean;
  visible: boolean;
  setVisible: (visible: boolean) => void;
  showSettingsMenu: boolean;
  setShowSettingsMenu: (show: boolean) => void;
  effectsEnabled: boolean;
}

export default function ReadingHeader({
  novel, // Expects Novel type
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

  return (
    <header
        className="reading-header-container bg-background border-b border-border text-foreground w-full z-40 fixed top-0 left-0 transition-opacity duration-300 ease-in-out"
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-2 md:py-3">
          {/* Left section */}
          <div className="flex items-center gap-2 md:gap-4 flex-shrink-0 min-w-0">
            <Link
               href={`/novels/${novel.id}`}
              className="p-1 md:p-2 rounded-lg hover:bg-accent flex-shrink-0"
              aria-label="Back to novel"
            >
              <ChevronLeft size={20} />
            </Link>
            <div className="hidden md:block overflow-hidden whitespace-nowrap min-w-0">
              <h1 className="text-sm font-medium truncate max-w-[200px] lg:max-w-xs">
                {novel.title} {/* Still valid */}
              </h1>
              <p className="text-xs text-muted-foreground truncate">
                Chapter {chapter.chapter_number}: {chapter.title}
              </p>
            </div>
          </div>

           {/* Center - Spacer */}
           <div className="flex-grow"></div>

          {/* Right section - Controls */}
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