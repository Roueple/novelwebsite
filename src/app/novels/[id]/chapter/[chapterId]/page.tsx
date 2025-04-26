// src/app/novels/[id]/chapter/[chapterId]/page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { getChapter, getNovel, getNovelChapters } from '@/lib/api';
import ReadingHeader from '@/components/reading/reading-header';
import ReadingView from '@/components/reading/reading-view';
import ReadingSettingsMenu from '@/components/reading/reading-settings-menu';
import LoadingScreen from '@/components/ui/loading-screen';
import NotFoundScreen from '@/components/ui/not-found-screen';
import { useReadingPreferences } from '@/hooks/use-reading-preferences';
import type { ChapterType, Novel } from '@/types/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import FloatingReadingControls from '@/components/reading/FloatingReadingControls';

export default function ChapterPage() {
  const { user, role } = useAuth();
  const params = useParams();
  const router = useRouter();
  const novelId = Number(params.id);
  const chapterNumber = Number(params.chapterId);

  // State management
  const [loading, setLoading] = useState(true);
  const [initialLoadError, setInitialLoadError] = useState<string | null>(null);
  const [chapter, setChapter] = useState<ChapterType | null>(null);
  const [novel, setNovel] = useState<Novel | null>(null);
  const [allChapters, setAllChapters] = useState<ChapterType[] | null>(null);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reading Preferences Hook
  const {
    textSize, effectsEnabled, animationsEnabled, fontFamily, lineSpacing,
    showSettingsMenu, settingsMenuRef, setShowSettingsMenu, changeTextSize,
    toggleEffects, toggleAnimations, changeFontFamily, changeLineSpacing,
    resetPreferences,
  } = useReadingPreferences();

  // Check if the user is the author
  const isAuthor = useMemo(() => user !== null && role === 'admin', [user, role]);

  // Fetch Data
  const loadData = useCallback(async () => {
    setLoading(true);
    setInitialLoadError(null);
    setAllChapters(null);
    if (isNaN(novelId) || isNaN(chapterNumber)) {
      setInitialLoadError('Invalid novel or chapter ID.'); setLoading(false); toast.error('Invalid URL parameters.'); router.push('/'); return;
    }
    try {
      const [novelData, chapterData, chaptersListData] = await Promise.all([
        getNovel(novelId), getChapter(novelId, chapterNumber), getNovelChapters(novelId)
      ]);
      if (!novelData) throw new Error('Novel not found');
      if (!chapterData) throw new Error('Chapter not found');
      setNovel(novelData); setChapter(chapterData); setAllChapters(chaptersListData || []);
    } catch (error: any) {
      console.error('Error loading chapter page data:', error);
      const message = error.message || 'Failed to load chapter data.';
      setInitialLoadError(message); toast.error(`Error: ${message}`);
      if (message.includes('not found')) { router.push(`/novels/${novelId || ''}`); }
    } finally {
      setLoading(false);
    }
  }, [novelId, chapterNumber, router]);

  useEffect(() => { loadData(); }, [loadData]);

  // Apply reading preference CSS variables
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--reading-line-height', lineSpacing.toString());
    root.style.setProperty('--reading-font-family', fontFamily);
    root.style.setProperty('--reading-font-size', textSize === 'sm' ? '0.9rem' : textSize === 'md' ? '1rem' : textSize === 'lg' ? '1.1rem' : '1.2rem');
    root.classList.toggle('disable-animations', !animationsEnabled);
    document.body.classList.toggle('focus-mode-wrapper', isFocusMode);
    return () => {
      root.style.removeProperty('--reading-line-height'); root.style.removeProperty('--reading-font-family'); root.style.removeProperty('--reading-font-size');
      root.classList.remove('disable-animations'); document.body.classList.remove('focus-mode-wrapper');
    };
  }, [animationsEnabled, lineSpacing, fontFamily, textSize, isFocusMode]);

  // Calculate previous and next chapter details
  const { prevChapter, nextChapter } = useMemo(() => {
    if (!allChapters) return { prevChapter: null, nextChapter: null };
    const sortedChapters = [...allChapters].sort((a, b) => a.chapter_number - b.chapter_number);
    const currentIndex = sortedChapters.findIndex(ch => ch.chapter_number === chapterNumber);
    if (currentIndex === -1) return { prevChapter: null, nextChapter: null };
    return {
      prevChapter: currentIndex > 0 ? sortedChapters[currentIndex - 1] : null,
      nextChapter: currentIndex < sortedChapters.length - 1 ? sortedChapters[currentIndex + 1] : null
    };
  }, [allChapters, chapterNumber]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
       const target = e.target as HTMLElement;
       if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
       if (e.key === 'Escape') {
         if (showSettingsMenu) setShowSettingsMenu(false);
         else if (isFocusMode) setIsFocusMode(false);
         else setHeaderVisible(true); return;
       }
       if (e.key === 's' && !e.ctrlKey && !e.metaKey && !e.altKey) { setShowSettingsMenu(prev => !prev); return; }
       if (e.key === 'f' && !e.ctrlKey && !e.metaKey && !e.altKey) { setIsFocusMode(prev => !prev); return; }
       if ((e.ctrlKey || e.metaKey) && !showSettingsMenu) {
         if (e.key === '+' || e.key === '=') { e.preventDefault(); if (textSize === 'sm') changeTextSize('md'); else if (textSize === 'md') changeTextSize('lg'); else if (textSize === 'lg') changeTextSize('xl'); }
         else if (e.key === '-') { e.preventDefault(); if (textSize === 'xl') changeTextSize('lg'); else if (textSize === 'lg') changeTextSize('md'); else if (textSize === 'md') changeTextSize('sm'); }
         return;
       }
       if (!e.ctrlKey && !e.metaKey && !e.altKey && !showSettingsMenu) {
         if (e.key === 'ArrowLeft' && prevChapter) { router.push(`/novels/${novelId}/chapter/${prevChapter.chapter_number}`); }
         else if (e.key === 'ArrowRight' && nextChapter) { router.push(`/novels/${novelId}/chapter/${nextChapter.chapter_number}`); }
       }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
      showSettingsMenu, setShowSettingsMenu, textSize, changeTextSize, isFocusMode, setIsFocusMode,
      router, novelId, prevChapter, nextChapter
  ]);

  // Scroll Listener for FAB Opacity
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolling(true);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // --- Loading and Error Handling ---
  if (loading) return <LoadingScreen message="Loading chapter..." />;
  if (initialLoadError) return <NotFoundScreen message={initialLoadError} returnUrl={`/novels/${novelId || ''}`} returnText="Back to Novel" />;
  if (!chapter || !novel) return <NotFoundScreen message="Chapter or Novel data could not be loaded." returnUrl={`/novels/${novelId || ''}`} returnText="Back to Novel"/>;

  // --- Main Render ---
  return (
    <div className={cn("reading-page", { 'focus-mode': isFocusMode })}>
        {!isFocusMode && novel && chapter && (
            <ReadingHeader
                novel={novel} chapter={chapter} isAuthor={isAuthor} visible={headerVisible}
                setVisible={setHeaderVisible} showSettingsMenu={showSettingsMenu}
                setShowSettingsMenu={setShowSettingsMenu} effectsEnabled={effectsEnabled}
            />
        )}
        <ReadingSettingsMenu
          isOpen={showSettingsMenu} onClose={() => setShowSettingsMenu(false)} menuRef={settingsMenuRef}
          textSize={textSize} onChangeTextSize={changeTextSize} effectsEnabled={effectsEnabled}
          onToggleEffects={toggleEffects} animationsEnabled={animationsEnabled} onToggleAnimations={toggleAnimations}
          fontFamily={fontFamily} onChangeFontFamily={changeFontFamily} lineSpacing={lineSpacing}
          onChangeLineSpacing={changeLineSpacing} onResetPreferences={resetPreferences}
        />

        <main className="min-h-screen bg-background text-foreground pt-16 md:pt-20 pb-24">
          {chapter && (
            // FIX: Wrap title and content in a single container for consistent alignment
            <div className="max-w-4xl mx-auto px-4 md:px-8">
                {/* Chapter Title */}
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-8"> {/* Keep margin-bottom */}
                    Chapter {chapter.chapter_number}: {chapter.title}
                </h1>

                {/* Reading View (Content) */}
                {/* ReadingView already contains the .prose class */}
                <ReadingView
                    content={chapter.content || ''} isLocked={chapter.is_locked} isAuthor={isAuthor}
                    isEditing={false} textSize={textSize} effectsEnabled={effectsEnabled}
                />
            </div>
          )}
        </main>

         {novel && chapter && allChapters && (
             <FloatingReadingControls
                 novelId={novelId}
                 currentChapterNumber={chapterNumber}
                 currentChapterId={chapter.id}
                 allChapters={allChapters}
                 isScrolling={isScrolling}
             />
         )}
    </div>
  );
}
