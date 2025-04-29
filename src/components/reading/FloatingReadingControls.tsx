// src/components/reading/FloatingReadingControls.tsx
"use client";

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, List, MessageSquare, X, BookOpen, Lock } from 'lucide-react';
import type { ChapterType } from '@/types/supabase';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import ChapterComments from './ChapterComments'; // Keep import

interface FloatingReadingControlsProps {
  novelId: number | null; // <-- Allow null
  currentChapterNumber: number | null; // <-- Allow null
  currentChapterId: number | null; // <-- Allow null
  allChapters: ChapterType[] | null; // <-- Allow null
  isScrolling?: boolean;
}

export default function FloatingReadingControls({
  novelId,
  currentChapterNumber,
  currentChapterId,
  allChapters,
  isScrolling = false,
}: FloatingReadingControlsProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredChapters, setFilteredChapters] = useState<ChapterType[]>([]);
  const [activeTab, setActiveTab] = useState<'chapters' | 'comments'>('chapters');
  const listRef = useRef<HTMLDivElement>(null);

  // Find previous and next chapters (handles null allChapters)
  const { prevChapter, nextChapter } = React.useMemo(() => {
    // Return null if essential data is missing
    if (!allChapters || currentChapterNumber === null) return { prevChapter: null, nextChapter: null };
    const sortedChapters = [...allChapters].sort((a, b) => a.chapter_number - b.chapter_number);
    const currentIndex = sortedChapters.findIndex(ch => ch.chapter_number === currentChapterNumber);
    if (currentIndex === -1) return { prevChapter: null, nextChapter: null };
    return {
      prevChapter: currentIndex > 0 ? sortedChapters[currentIndex - 1] : null,
      nextChapter: currentIndex < sortedChapters.length - 1 ? sortedChapters[currentIndex + 1] : null,
    };
  }, [allChapters, currentChapterNumber]);

  // Filter chapters (handles null allChapters)
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
      ).sort((a, b) => a.chapter_number - b.chapter_number)
    );
  }, [searchTerm, allChapters]);

  // Scroll to current chapter (handles null currentChapterNumber)
  useEffect(() => {
    if (isSheetOpen && activeTab === 'chapters' && listRef.current && currentChapterNumber !== null) {
      const currentChapterElement = listRef.current.querySelector(`[data-chapter-number="${currentChapterNumber}"]`) as HTMLElement;
      if (currentChapterElement) {
        currentChapterElement.scrollIntoView({ behavior: 'auto', block: 'center' });
      }
    }
  }, [isSheetOpen, activeTab, currentChapterNumber]);

  const handleChapterLinkClick = () => {
    setIsSheetOpen(false);
  };

  // Reset search term when changing tabs or closing sheet
  useEffect(() => {
      if (!isSheetOpen) {
          setSearchTerm('');
          setActiveTab('chapters');
      }
  }, [isSheetOpen]);

  // *** RENDER NULL IF ESSENTIAL DATA IS MISSING ***
  if (novelId === null || currentChapterNumber === null || currentChapterId === null || !allChapters) {
      return null; // Don't render controls if data isn't ready
  }
  // *** END NULL CHECK ***


  return (
    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
      {/* Floating Action Button (FAB) Trigger */}
      <SheetTrigger asChild>
        <Button
          variant="default"
          size="icon"
          className={cn(
            "fixed bottom-6 right-6 z-50 rounded-full shadow-lg h-14 w-14",
            "transition-opacity duration-300 ease-in-out",
            isScrolling ? "opacity-40 hover:opacity-90" : "opacity-100"
          )}
          aria-label="Open reading controls"
        >
          <List size={24} />
        </Button>
      </SheetTrigger>

      {/* Sheet Content (Panel) */}
      <SheetContent
        side="bottom"
        className="h-[85vh] flex flex-col bg-background border-t border-border p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <SheetHeader className="p-4 border-b border-border flex flex-row justify-between items-center flex-shrink-0">
          <SheetTitle className="text-lg font-semibold text-foreground">Reading Controls</SheetTitle>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
                <X size={18}/> {/* Use X for close */}
                <span className="sr-only">Close</span>
            </Button>
          </SheetClose>
        </SheetHeader>

        {/* Quick Navigation */}
        <div className="flex justify-between items-center p-3 border-b border-border flex-shrink-0">
          {prevChapter ? (
            <Button variant="outline" size="sm" onClick={handleChapterLinkClick} asChild>
              <Link href={`/novels/${novelId}/chapter/${prevChapter.chapter_number}`} className="flex items-center gap-1">
                <ChevronLeft size={16} /> Prev
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled className="opacity-50">
              <ChevronLeft size={16} /> Prev
            </Button>
          )}

          {nextChapter ? (
            <Button variant="outline" size="sm" onClick={handleChapterLinkClick} asChild>
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

        {/* Tabs for Chapters and Comments */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'chapters' | 'comments')} className="flex flex-col flex-grow overflow-hidden">
          <TabsList className="grid w-full grid-cols-2 rounded-none border-b border-border h-11 flex-shrink-0">
            <TabsTrigger value="chapters" className="rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                <BookOpen size={16} className="mr-2"/> Chapters
            </TabsTrigger>
            <TabsTrigger value="comments" className="rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                <MessageSquare size={16} className="mr-2"/> Comments
            </TabsTrigger>
          </TabsList>

          {/* Chapters Tab Content */}
          <TabsContent value="chapters" className="flex flex-col flex-grow overflow-hidden p-4 mt-0 data-[state=inactive]:hidden">
            <Input
              type="text"
              placeholder="Search chapters..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mb-3 h-9 flex-shrink-0"
            />
            <ScrollArea className="flex-grow" >
              <div ref={listRef} className="space-y-1 pr-3">
                {filteredChapters.length > 0 ? (
                  filteredChapters.map((chapter) => (
                    <Button
                      key={chapter.id}
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "w-full justify-start h-auto py-1.5 px-2 text-left",
                        chapter.chapter_number === currentChapterNumber
                          ? "bg-accent text-accent-foreground font-semibold"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                      )}
                      onClick={handleChapterLinkClick}
                      data-chapter-number={chapter.chapter_number}
                      asChild
                    >
                      <Link href={`/novels/${novelId}/chapter/${chapter.chapter_number}`} className="flex items-center justify-between w-full gap-2">
                        <span className="truncate flex-grow">
                           {chapter.chapter_number}. {chapter.title}
                        </span>
                        {chapter.is_locked && (
                          <Lock size={12} className="text-muted-foreground flex-shrink-0" />
                        )}
                      </Link>
                    </Button>
                  ))
                 ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {searchTerm ? 'No chapters match search.' : 'No chapters available.'}
                  </p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Comments Tab Content */}
          <TabsContent value="comments" className="flex-grow overflow-hidden mt-0 data-[state=inactive]:hidden">
            {/* Ensure comments only render when sheet and tab are active */}
            {isSheetOpen && activeTab === 'comments' && (
                 <ScrollArea className="h-full p-4">
                     {/* Pass non-null chapterId and novelId */}
                    <ChapterComments chapterId={currentChapterId} novelId={novelId} />
                 </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}