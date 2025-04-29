// src/components/reading/FloatingReadingControls.tsx
"use client";
import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { List, MessageSquare, X, BookOpen, Lock } from 'lucide-react'; // Removed ChevronLeft/Right
import type { ChapterType } from '@/types/supabase';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import ChapterComments from './ChapterComments'; // Keep import

interface FloatingReadingControlsProps {
  novelId: number | null; // Allow null
  currentChapterNumber: number | null; // Allow null
  currentChapterId: number | null; // Allow null
  allChapters: ChapterType[] | null; // Allow null
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

  // Filter chapters logic (remains the same)
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

  // Scroll to current chapter logic (remains the same)
  useEffect(() => {
    if (isSheetOpen && activeTab === 'chapters' && listRef.current && currentChapterNumber !== null) {
      const currentChapterElement = listRef.current.querySelector(`[data-chapter-number="${currentChapterNumber}"]`) as HTMLElement;
      if (currentChapterElement) {
        currentChapterElement.scrollIntoView({ behavior: 'auto', block: 'center' });
      }
    }
  }, [isSheetOpen, activeTab, currentChapterNumber]);

  // Reset state when sheet closes (remains the same)
  useEffect(() => {
      if (!isSheetOpen) {
          setSearchTerm('');
          setActiveTab('chapters');
      }
  }, [isSheetOpen]);

  const handleChapterLinkClick = () => {
    setIsSheetOpen(false);
  };

  // Render null if essential data is missing (remains the same)
  if (novelId === null || currentChapterNumber === null || currentChapterId === null || !allChapters) {
      return null;
  }

  return (
    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
      {/* Floating Action Button (FAB) Trigger - Positioned further from corner */}
      <SheetTrigger asChild>
        <Button
          variant="default"
          size="icon"
          className={cn(
            "fixed bottom-6 z-50 rounded-full shadow-lg h-14 w-14",
            "right-[calc(50%-1.75rem)] transform translate-x-1/2", // Center horizontally
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
                 <X size={18}/>
                <span className="sr-only">Close</span>
            </Button>
          </SheetClose>
        </SheetHeader>

        {/* Quick Navigation REMOVED from here */}

        {/* Tabs for Chapters and Comments */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'chapters' | 'comments')} className="flex flex-col flex-grow overflow-hidden">
          <TabsList className="grid w-full grid-cols-2 rounded-none border-b border-border h-11 flex-shrink-0">
            <TabsTrigger value="chapters" className="rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                <BookOpen size={16} className="mr-2"/> Chapters ({allChapters?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger value="comments" className="rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                <MessageSquare size={16} className="mr-2"/> Comments
            </TabsTrigger>
          </TabsList>

          {/* Chapters Tab Content (Remains the same) */}
          <TabsContent value="chapters" className="flex flex-col flex-grow overflow-hidden p-4 mt-0 data-[state=inactive]:hidden">
            <Input
              type="text"
              placeholder="Search chapters by number or title..."
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

          {/* Comments Tab Content (Remains the same) */}
          <TabsContent value="comments" className="flex-grow overflow-hidden mt-0 data-[state=inactive]:hidden">
            {/* Ensure comments only render when sheet and tab are active */}
            {isSheetOpen && activeTab === 'comments' && (
                 <ScrollArea className="h-full p-4">
                    <ChapterComments chapterId={currentChapterId} novelId={novelId} />
                 </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}