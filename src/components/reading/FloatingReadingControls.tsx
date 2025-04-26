// src/components/reading/FloatingReadingControls.tsx
"use client";

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet'; // Using Sheet for the panel
import { ChevronLeft, ChevronRight, List, MessageSquare, X } from 'lucide-react';
import type { ChapterType } from '@/types/supabase';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area'; // For scrollable chapter list
import { cn } from '@/lib/utils';

interface FloatingReadingControlsProps {
  novelId: number;
  currentChapterNumber: number;
  allChapters: ChapterType[] | null;
  onToggleComments: () => void; // Callback to toggle comments section visibility
}

export default function FloatingReadingControls({
  novelId,
  currentChapterNumber,
  allChapters,
  onToggleComments,
}: FloatingReadingControlsProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredChapters, setFilteredChapters] = useState<ChapterType[]>([]);
  const listRef = useRef<HTMLDivElement>(null); // Ref for the scrollable list

  // Find previous and next chapters
  const { prevChapter, nextChapter } = React.useMemo(() => {
    if (!allChapters) return { prevChapter: null, nextChapter: null };
    const sortedChapters = [...allChapters].sort((a, b) => a.chapter_number - b.chapter_number);
    const currentIndex = sortedChapters.findIndex(ch => ch.chapter_number === currentChapterNumber);
    if (currentIndex === -1) return { prevChapter: null, nextChapter: null };
    return {
      prevChapter: currentIndex > 0 ? sortedChapters[currentIndex - 1] : null,
      nextChapter: currentIndex < sortedChapters.length - 1 ? sortedChapters[currentIndex + 1] : null,
    };
  }, [allChapters, currentChapterNumber]);

  // Filter chapters based on search term
  useEffect(() => {
    if (!allChapters) {
      setFilteredChapters([]);
      return;
    }
    const lowerSearchTerm = searchTerm.toLowerCase();
    setFilteredChapters(
      allChapters.filter(ch =>
        ch.title.toLowerCase().includes(lowerSearchTerm) ||
        ch.chapter_number.toString().includes(lowerSearchTerm)
      ).sort((a, b) => a.chapter_number - b.chapter_number) // Ensure sorted
    );
  }, [searchTerm, allChapters]);

  // Scroll to current chapter in the list when the sheet opens
  useEffect(() => {
    if (isSheetOpen && listRef.current) {
      const currentChapterElement = listRef.current.querySelector(`[data-chapter-number="${currentChapterNumber}"]`) as HTMLElement;
      if (currentChapterElement) {
        // Scroll into view, centered if possible
        currentChapterElement.scrollIntoView({ behavior: 'auto', block: 'center' });
      }
    }
  }, [isSheetOpen, currentChapterNumber]);


  const handleChapterLinkClick = () => {
    setIsSheetOpen(false); // Close sheet on chapter navigation
  };

  const handleToggleCommentsClick = () => {
     onToggleComments();
     setIsSheetOpen(false); // Close sheet after toggling comments
  }

  return (
    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
      {/* Floating Action Button (FAB) Trigger */}
      <SheetTrigger asChild>
        <Button
          variant="default" // Use primary color
          size="icon"
          className="fixed bottom-6 right-6 z-50 rounded-full shadow-lg h-14 w-14"
          aria-label="Open reading controls"
        >
          <List size={24} />
        </Button>
      </SheetTrigger>

      {/* Sheet Content (Panel) */}
      <SheetContent side="bottom" className="h-[75vh] flex flex-col bg-background border-t border-border p-0"> {/* Adjust height, remove padding */}
        <SheetHeader className="p-4 border-b border-border flex flex-row justify-between items-center">
          <SheetTitle className="text-lg font-semibold text-foreground">Reading Controls</SheetTitle>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <X size={20} />
            </Button>
          </SheetClose>
        </SheetHeader>

        {/* Quick Navigation */}
        <div className="flex justify-between items-center p-4 border-b border-border">
          {prevChapter ? (
            <Button asChild variant="outline" size="sm" onClick={handleChapterLinkClick}>
              <Link href={`/novels/${novelId}/chapter/${prevChapter.chapter_number}`} className="flex items-center gap-1">
                <ChevronLeft size={16} /> Prev
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled className="opacity-50">
              <ChevronLeft size={16} /> Prev
            </Button>
          )}

          <Button variant="secondary" size="sm" onClick={handleToggleCommentsClick} className="flex items-center gap-1">
             <MessageSquare size={16} /> Comments
          </Button>

          {nextChapter ? (
            <Button asChild variant="outline" size="sm" onClick={handleChapterLinkClick}>
              <Link href={`/novels/${novelId}/chapter/${nextChapter.chapter_number}`} className="flex items-center gap-1">
                Next <ChevronRight size={16} />
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled className="opacity-50">
              Next <ChevronRight size={16} />
            </Button>
          )}
        </div>

        {/* Chapter List */}
        <div className="flex flex-col flex-grow overflow-hidden p-4">
          <h3 className="text-base font-medium mb-2 text-foreground">Chapters</h3>
          <Input
            type="text"
            placeholder="Search chapters..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-3 h-9"
          />
          <ScrollArea className="flex-grow" ref={listRef}> {/* Make list scrollable */}
            <div className="space-y-1 pr-3"> {/* Add padding-right for scrollbar */}
              {filteredChapters.length > 0 ? (
                filteredChapters.map((chapter) => (
                  <Button
                    key={chapter.id}
                    asChild
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "w-full justify-start h-auto py-1.5 px-2 text-left",
                      chapter.chapter_number === currentChapterNumber
                        ? "bg-accent text-accent-foreground font-semibold"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                    )}
                    onClick={handleChapterLinkClick}
                    data-chapter-number={chapter.chapter_number} // Add data attribute for scrolling
                  >
                    <Link href={`/novels/${novelId}/chapter/${chapter.chapter_number}`} className="block w-full truncate">
                      {chapter.chapter_number}. {chapter.title}
                    </Link>
                  </Button>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {searchTerm ? 'No chapters match your search.' : 'No chapters available.'}
                </p>
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
