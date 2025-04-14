// src/app/novels/[id]/chapter/[chapterId]/page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
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

export default function ChapterPage() {
  const { user, role } = useAuth();
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname(); // Get current pathname
  const novelId = Number(params.id);
  const chapterNumber = Number(params.chapterId);

  // State management
  const [loading, setLoading] = useState(true);
  const [initialLoadError, setInitialLoadError] = useState<string | null>(null);
  const [chapter, setChapter] = useState<ChapterType | null>(null);
  const [novel, setNovel] = useState<NovelType | null>(null);
  const [headerVisible, setHeaderVisible] = useState(true);

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
    toggleEffects, // Include toggleEffects
    toggleAnimations,
    changeFontFamily,
    changeLineSpacing,
    resetPreferences
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
      return;
    }

    try {
      // Fetch novel details first to check author_id
      const novelData = await getNovel(novelId);
      if (!novelData) throw new Error('Novel not found');
      setNovel(novelData); // Set novel data early

      // Then fetch the specific chapter
      const chapterData = await getChapter(novelId, chapterNumber);
      if (!chapterData) throw new Error('Chapter not found');
      setChapter(chapterData);

    } catch (error: any) {
      console.error('Error loading chapter data:', error);
      setInitialLoadError(error.message || 'Failed to load chapter data.');
      toast.error(`Error: ${error.message || 'Failed to load chapter data.'}`);
    } finally {
      setLoading(false);
    }
  }, [novelId, chapterNumber]);

  useEffect(() => {
    loadData();
  }, [loadData]); // Use the memoized loadData function

  // Apply reading preference CSS variables and classes
  useEffect(() => {
    document.documentElement.classList.toggle('disable-animations', !animationsEnabled);
    document.documentElement.style.setProperty('--reading-line-height', lineSpacing.toString());
    document.documentElement.style.setProperty('--reading-font-family', fontFamily);

    return () => {
      // Cleanup styles on unmount if necessary
      document.documentElement.classList.remove('disable-animations');
      document.documentElement.style.removeProperty('--reading-line-height');
      document.documentElement.style.removeProperty('--reading-font-family');
    };
  }, [animationsEnabled, lineSpacing, fontFamily]);

  // Calculate page classes based on animationsEnabled
  const pageClasses = useMemo(() => {
    return ['reading-page', !animationsEnabled ? 'disable-animations' : ''].filter(Boolean).join(' ');
  }, [animationsEnabled]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showSettingsMenu) {
        setShowSettingsMenu(false); return;
      }
      if (e.key === 's' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        setShowSettingsMenu(prev => !prev); return;
      }
       // Text size shortcuts (Ctrl/Cmd + +/-)
       if (e.ctrlKey || e.metaKey) {
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
      }
       // Arrow key navigation
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
      showSettingsMenu,
      textSize,
      setShowSettingsMenu,
      changeTextSize,
      router,
      novelId,
      // Add prev/next chapter numbers here if needed for arrow key nav dependency
  ]);

  // Calculate previous and next chapter details
  const { prevChapter, nextChapter } = useMemo(() => {
    if (!novel?.chapters) return { prevChapter: null, nextChapter: null };
    const sortedChapters = [...novel.chapters].sort((a, b) => a.chapter_number - b.chapter_number);
    const currentIndex = sortedChapters.findIndex(ch => ch.chapter_number === chapterNumber);
    return {
      prevChapter: currentIndex > 0 ? sortedChapters[currentIndex - 1] : null,
      nextChapter: currentIndex < sortedChapters.length - 1 ? sortedChapters[currentIndex + 1] : null
    };
  }, [novel?.chapters, chapterNumber]);

  // --- Loading and Error Handling ---
  if (loading) {
    return <LoadingScreen message="Loading chapter..." />;
  }
  if (initialLoadError) {
    return <NotFoundScreen message={initialLoadError} returnUrl={`/novels/${novelId || ''}`} returnText="Back to Novel" />;
  }
  if (!chapter || !novel) {
    return <NotFoundScreen message="Chapter or Novel data could not be loaded." returnUrl={`/novels/${novelId || ''}`} returnText="Back to Novel"/>;
  }

  return (
    <div className={pageClasses}>
      <main
        className="min-h-screen bg-theme-background text-theme-foreground" // Applied directly here for clarity
        style={{
          fontFamily: `var(--reading-font-family, ${fontFamily})`, // Use CSS variable
          lineHeight: `var(--reading-line-height, ${lineSpacing})` // Use CSS variable
        }}
      >
        {/* ReadingHeader - Pass only necessary props */}
        <ReadingHeader
          novel={novel}
          chapter={chapter}
          isAuthor={isAuthor} // Pass author status for potential "Edit" button link
          visible={headerVisible}
          setVisible={setHeaderVisible}
          showSettingsMenu={showSettingsMenu}
          setShowSettingsMenu={setShowSettingsMenu}
          effectsEnabled={effectsEnabled} // Pass for display icon
          // Removed editing-related props: isEditing, onEdit, onSave, onLockToggle, onCancelEdit, saving
        />

        {/* Settings Menu Component - Remains the same */}
        <ReadingSettingsMenu
          isOpen={showSettingsMenu}
          onClose={() => setShowSettingsMenu(false)}
          menuRef={settingsMenuRef}
          textSize={textSize}
          onChangeTextSize={changeTextSize}
          effectsEnabled={effectsEnabled}
          onToggleEffects={toggleEffects} // Pass toggle function
          animationsEnabled={animationsEnabled}
          onToggleAnimations={toggleAnimations}
          fontFamily={fontFamily}
          onChangeFontFamily={changeFontFamily}
          lineSpacing={lineSpacing}
          onChangeLineSpacing={changeLineSpacing}
          onResetPreferences={resetPreferences}
        />

        {/* Chapter Content Area */}
        <div className="py-20 md:py-24"> {/* Increased padding for header space */}
          {/* Chapter Title */}
          <div className="max-w-4xl mx-auto px-4 md:px-8 mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-theme-foreground">
              Chapter {chapter.chapter_number}: {chapter.title}
            </h1>
          </div>

          {/* Reading View Component */}
          <ReadingView
            content={chapter.content || ''} // Pass content
            isLocked={chapter.is_locked}
            isAuthor={isAuthor} // Let ReadingView decide about lock overlay
            isEditing={false} // Always false on the reading page
            textSize={textSize}
            effectsEnabled={effectsEnabled}
            // Removed saving and onContentChange props
          />

          {/* Chapter Navigation */}
          <ChapterNavigation
            novelId={novelId}
            prevChapter={prevChapter}
            nextChapter={nextChapter}
          />
        </div>
      </main>
    </div>
  );
}