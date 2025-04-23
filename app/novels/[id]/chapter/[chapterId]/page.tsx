// src/app/novels/[id]/chapter/[chapterId]/page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { getChapter, getNovel } from '@/lib/api';
import ReadingHeader from '@/components/reading/reading-header';
import ReadingView from '@/components/reading/reading-view';
import ChapterNavigation from '@/components/reading/chapter-navigation';
import ReadingSettingsMenu from '@/components/reading/reading-settings-menu';
import LoadingScreen from '@/components/ui/loading-screen';
import NotFoundScreen from '@/components/ui/not-found-screen';
import { useReadingPreferences } from '@/hooks/use-reading-preferences';
import type { ChapterType, NovelType } from '@/types/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils'; // Import cn

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
  const [novel, setNovel] = useState<NovelType | null>(null);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [isFocusMode, setIsFocusMode] = useState(false); // State for focus mode

  // Reading Preferences Hook
  const {
    textSize,
    effectsEnabled,
    animationsEnabled,
    fontFamily,
    lineSpacing,
    showSettingsMenu,
    settingsMenuRef,
    setShowSettingsMenu,
    changeTextSize,
    toggleEffects,
    toggleAnimations,
    changeFontFamily,
    changeLineSpacing,
    resetPreferences,
    // Add theme from preferences if needed elsewhere, but ThemeProvider handles visual theme
  } = useReadingPreferences();

  // Check if the user is the author of this specific novel
  const isAuthor = useMemo(() => {
    if (!user || !novel) return false;
    return role === 'admin' || novel.author_id === user.id;
  }, [user, novel, role]);

  // Fetch Data
  const loadData = useCallback(async () => {
    setLoading(true);
    setInitialLoadError(null);
    if (isNaN(novelId) || isNaN(chapterNumber)) {
      setInitialLoadError('Invalid novel or chapter ID.');
      setLoading(false);
      toast.error('Invalid URL parameters.');
      router.push('/'); // Redirect on invalid ID
      return;
    }

    try {
      const novelData = await getNovel(novelId);
      if (!novelData) throw new Error('Novel not found');
      setNovel(novelData);

      const chapterData = await getChapter(novelId, chapterNumber);
      if (!chapterData) throw new Error('Chapter not found');
      setChapter(chapterData);

    } catch (error: any) {
      console.error('Error loading chapter data:', error);
      const message = error.message || 'Failed to load chapter data.';
      setInitialLoadError(message);
      toast.error(`Error: ${message}`);
      // Consider redirecting if novel/chapter not found
      if (message.includes('not found')) {
         router.push(`/novels/${novelId || ''}`);
      }
    } finally {
      setLoading(false);
    }
  }, [novelId, chapterNumber, router]); // Added router dependency

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Apply reading preference CSS variables and classes to the HTML element
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--reading-line-height', lineSpacing.toString());
    root.style.setProperty('--reading-font-family', fontFamily);
    root.style.setProperty('--reading-font-size', textSize === 'sm' ? '0.9rem' : textSize === 'md' ? '1rem' : textSize === 'lg' ? '1.1rem' : '1.2rem'); // Example mapping

    // Apply animation disabling class
    root.classList.toggle('disable-animations', !animationsEnabled);

    // Apply focus mode class to a wrapper or body
    document.body.classList.toggle('focus-mode-wrapper', isFocusMode); // Add to body for simplicity

    return () => {
      // Cleanup styles on unmount
      root.style.removeProperty('--reading-line-height');
      root.style.removeProperty('--reading-font-family');
      root.style.removeProperty('--reading-font-size');
      root.classList.remove('disable-animations');
      document.body.classList.remove('focus-mode-wrapper');
    };
  }, [animationsEnabled, lineSpacing, fontFamily, textSize, isFocusMode]);

  // Calculate previous and next chapter details
  const { prevChapter, nextChapter } = useMemo(() => {
    if (!novel?.chapters) return { prevChapter: null, nextChapter: null };
    // Ensure chapters are sorted numerically before finding index
    const sortedChapters = [...novel.chapters].sort((a, b) => a.chapter_number - b.chapter_number);
    const currentIndex = sortedChapters.findIndex(ch => ch.chapter_number === chapterNumber);
    if (currentIndex === -1) return { prevChapter: null, nextChapter: null }; // Chapter not found in list
    return {
      prevChapter: currentIndex > 0 ? sortedChapters[currentIndex - 1] : null,
      nextChapter: currentIndex < sortedChapters.length - 1 ? sortedChapters[currentIndex + 1] : null
    };
  }, [novel?.chapters, chapterNumber]);


  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
       // Allow input if focus is on an input/textarea (e.g., search in header if it existed)
       const target = e.target as HTMLElement;
       if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
         return;
       }

      if (e.key === 'Escape') {
          if (showSettingsMenu) setShowSettingsMenu(false);
          else if (isFocusMode) setIsFocusMode(false); // Escape also exits focus mode
          else setHeaderVisible(true); // Ensure header is visible on escape
          return;
      }
      // Toggle Settings: 's'
      if (e.key === 's' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        setShowSettingsMenu(prev => !prev);
        return;
      }
      // Toggle Focus Mode: 'f'
      if (e.key === 'f' && !e.ctrlKey && !e.metaKey && !e.altKey) {
         setIsFocusMode(prev => !prev);
         return;
      }

       // Text size shortcuts (Ctrl/Cmd + +/-) - Only when settings menu isn't open
       if ((e.ctrlKey || e.metaKey) && !showSettingsMenu) {
         if (e.key === '+' || e.key === '=') {
           e.preventDefault();
           if (textSize === 'sm') changeTextSize('md');
           else if (textSize === 'md') changeTextSize('lg');
           else if (textSize === 'lg') changeTextSize('xl');
         } else if (e.key === '-') {
           e.preventDefault();
           if (textSize === 'xl') changeTextSize('lg');
           else if (textSize === 'lg') changeTextSize('md');
           else if (textSize === 'md') changeTextSize('sm');
         }
         return; // Prevent arrow key nav if resizing
      }

       // Arrow key navigation - Only when settings menu isn't open
       if (!e.ctrlKey && !e.metaKey && !e.altKey && !showSettingsMenu) {
         if (e.key === 'ArrowLeft' && prevChapter) {
           router.push(`/novels/${novelId}/chapter/${prevChapter.chapter_number}`);
         } else if (e.key === 'ArrowRight' && nextChapter) {
           router.push(`/novels/${novelId}/chapter/${nextChapter.chapter_number}`);
         }
       }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
      showSettingsMenu, setShowSettingsMenu,
      textSize, changeTextSize,
      isFocusMode, setIsFocusMode,
      router, novelId, prevChapter, nextChapter // Added prev/next dependencies
  ]);


  // --- Loading and Error Handling ---
  if (loading) {
    return <LoadingScreen message="Loading chapter..." />;
  }
  if (initialLoadError) {
    return <NotFoundScreen message={initialLoadError} returnUrl={`/novels/${novelId || ''}`} returnText="Back to Novel" />;
  }
  if (!chapter || !novel) {
    // This case should ideally be caught by initialLoadError, but added as a safeguard
    return <NotFoundScreen message="Chapter or Novel data could not be loaded." returnUrl={`/novels/${novelId || ''}`} returnText="Back to Novel"/>;
  }

  // Apply the reading theme class directly here if ThemeProvider doesn't handle it globally enough
  // However, ThemeProvider should handle the `<html>` or `<body>` class application.

  return (
    // Add focus mode class conditionally to the main container
    <div className={cn("reading-page", { 'focus-mode': isFocusMode })}>
        {/* ReadingHeader is now part of the normal flow, not sticky */}
        {/* Conditionally render Header based on isFocusMode */}
        {!isFocusMode && (
            <ReadingHeader
            novel={novel}
            chapter={chapter}
            isAuthor={isAuthor}
            visible={headerVisible} // Controlled by state
            setVisible={setHeaderVisible} // Allow header to manage its explicit show/hide button interaction
            showSettingsMenu={showSettingsMenu}
            setShowSettingsMenu={setShowSettingsMenu}
            effectsEnabled={effectsEnabled}
            />
        )}


        {/* Settings Menu Component - Remains the same */}
        <ReadingSettingsMenu
          isOpen={showSettingsMenu}
          onClose={() => setShowSettingsMenu(false)}
          menuRef={settingsMenuRef}
          textSize={textSize}
          onChangeTextSize={changeTextSize}
          effectsEnabled={effectsEnabled}
          onToggleEffects={toggleEffects}
          animationsEnabled={animationsEnabled}
          onToggleAnimations={toggleAnimations}
          fontFamily={fontFamily}
          onChangeFontFamily={changeFontFamily}
          lineSpacing={lineSpacing}
          onChangeLineSpacing={changeLineSpacing}
          onResetPreferences={resetPreferences}
        />

        {/* Chapter Content Area - Add padding to account for non-sticky header */}
        {/* pt-16 or pt-20 ensures content starts below where header *would* be */}
        <main className="min-h-screen bg-background text-foreground pt-16 md:pt-20 pb-8">

          {/* Chapter Title */}
          <div className="max-w-4xl mx-auto px-4 md:px-8 mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Chapter {chapter.chapter_number}: {chapter.title}
            </h1>
          </div>

          {/* Reading View Component */}
          <ReadingView
            content={chapter.content || ''}
            isLocked={chapter.is_locked}
            isAuthor={isAuthor}
            isEditing={false} // Explicitly false
            textSize={textSize}
            effectsEnabled={effectsEnabled}
          />

           {/* Chapter Navigation - Conditionally render based on focus mode */}
           {!isFocusMode && (
                <ChapterNavigation
                    novelId={novelId}
                    prevChapter={prevChapter}
                    nextChapter={nextChapter}
                />
            )}
        </main>
    </div>
  );
}