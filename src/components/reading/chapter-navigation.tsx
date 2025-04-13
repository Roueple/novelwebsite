// src/components/reading/chapter-navigation.tsx
import React from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ChapterType } from '@/types/supabase';

interface ChapterNavigationProps {
  novelId: number;
  prevChapter: ChapterType | null;
  nextChapter: ChapterType | null;
}

export default function ChapterNavigation({ 
  novelId, 
  prevChapter, 
  nextChapter 
}: ChapterNavigationProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 my-8 chapter-navigation">
      <div className="flex justify-between items-center">
        {prevChapter ? (
          <Link
            href={`/novels/${novelId}/chapter/${prevChapter.chapter_number}`}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-theme-border hover:bg-theme-hover"
          >
            <ChevronLeft size={18} />
            <span className="text-sm">Previous Chapter</span>
          </Link>
        ) : (
          <div></div> // Empty div to maintain flex spacing
        )}

        <Link
          href={`/novels/${novelId}`}
          className="px-4 py-2 text-sm rounded-lg border border-theme-border hover:bg-theme-hover mx-2"
        >
          Chapter List
        </Link>

        {nextChapter ? (
          <Link
            href={`/novels/${novelId}/chapter/${nextChapter.chapter_number}`}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-theme-border hover:bg-theme-hover"
          >
            <span className="text-sm">Next Chapter</span>
            <ChevronRight size={18} />
          </Link>
        ) : (
          <div></div> // Empty div to maintain flex spacing
        )}
      </div>
    </div>
  );
}