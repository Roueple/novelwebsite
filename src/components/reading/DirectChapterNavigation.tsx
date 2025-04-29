// src/components/reading/DirectChapterNavigation.tsx
"use client";

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ChapterType } from '@/types/supabase';
import { cn } from '@/lib/utils';

interface DirectChapterNavigationProps {
  novelId: number;
  prevChapter: ChapterType | null;
  nextChapter: ChapterType | null;
  isScrolling: boolean; // To fade buttons slightly during scroll
}

export default function DirectChapterNavigation({
  novelId,
  prevChapter,
  nextChapter,
  isScrolling,
}: DirectChapterNavigationProps) {

  const buttonBaseClasses = "fixed bottom-6 z-40 rounded-full shadow-md h-10 w-10 p-0 transition-opacity duration-300 ease-in-out";
  const buttonHoverClasses = "hover:bg-primary/90";
  const scrollFadeClass = isScrolling ? "opacity-40 hover:opacity-100" : "opacity-90";

  return (
    <>
      {/* Previous Chapter Button */}
      {prevChapter ? (
        <Button
          variant="default"
          size="icon"
          className={cn(buttonBaseClasses, "left-6", scrollFadeClass, buttonHoverClasses)}
          aria-label={`Go to Previous Chapter: ${prevChapter.title}`}
          title={`Previous: Ch ${prevChapter.chapter_number}`}
          asChild
        >
          <Link href={`/novels/${novelId}/chapter/${prevChapter.chapter_number}`}>
            <ChevronLeft size={20} />
          </Link>
        </Button>
      ) : (
        // Disabled Previous Button Placeholder (Optional, or render nothing)
        <Button
          variant="default"
          size="icon"
          className={cn(buttonBaseClasses, "left-6", "opacity-30 cursor-not-allowed")}
          disabled
          aria-label="No previous chapter"
        >
          <ChevronLeft size={20} />
        </Button>
      )}

      {/* Next Chapter Button */}
      {nextChapter ? (
        <Button
          variant="default"
          size="icon"
          className={cn(buttonBaseClasses, "right-6", scrollFadeClass, buttonHoverClasses)}
          aria-label={`Go to Next Chapter: ${nextChapter.title}`}
          title={`Next: Ch ${nextChapter.chapter_number}`}
          asChild
        >
          <Link href={`/novels/${novelId}/chapter/${nextChapter.chapter_number}`}>
            <ChevronRight size={20} />
          </Link>
        </Button>
      ) : (
         // Disabled Next Button Placeholder (Optional, or render nothing)
         <Button
          variant="default"
          size="icon"
          className={cn(buttonBaseClasses, "right-6", "opacity-30 cursor-not-allowed")}
          disabled
          aria-label="No next chapter"
        >
          <ChevronRight size={20} />
        </Button>
      )}
    </>
  );
}