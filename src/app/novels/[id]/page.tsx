// src/app/novels/[id]/chapter/[chapterId]/page.tsx
"use client";

// --- Imports ---
import { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { getChapter, getNovel, getNovelChapters } from '@/lib/api';
import ReadingHeader from '@/components/reading/reading-header'; // Import modified Header
import ReadingView from '@/components/reading/reading-view'; // Import modified View
import ReadingSettingsMenu from '@/components/reading/reading-settings-menu';
import NotFoundScreen from '@/components/ui/not-found-screen';
import { useReadingPreferences } from '@/hooks/use-reading-preferences';
import type { ChapterType, Novel } from '@/types/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import FloatingReadingControls from '@/components/reading/FloatingReadingControls'; // Import modified Controls
import LoadingSpinner from '@/components/ui/loading-spinner'; // Keep for fallback

const ChapterComments = dynamic(() => import('@/components/reading/ChapterComments'), {
  ssr: false,
  loading: () => <CommentsFallback />,
});

function CommentsFallback() {
    return (
        <div className="mt-8 pt-6 border-t border-border">
            <h3 className="text-xl font-semibold mb-4 text-foreground">Comments</h3>
            <div className="flex justify-center items-center py-8">
                <LoadingSpinner size="md" />
                <span className="ml-2 text-muted-foreground">Loading comments section...</span>
            </div>
        </div>
    );
}

export default function ChapterPage() {
  // --- Hooks and State ---
  const { user, role, loading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const novelId = Number(params.id);
  const chapterNumber = Number(params.chapterId);

  const [novel, setNovel] = useState<Novel | null>(null);
  const [allChapters, setAllChapters] = useState<ChapterType[] | null>(null);
  const [currentChapter, setCurrentChapter] = useState<ChapterType | null>(null);
  // No 'initialLoading' state needed here anymore for the main spinner
  const [pageError, setPageError] = useState<string | null>(null);

  // Reading preferences and UI state
  const {
    textSize, effectsEnabled, animationsEnabled, fontFamily, lineSpacing,
    showSettingsMenu, settingsMenuRef, setShowSettingsMenu, changeTextSize,
    toggleEffects, toggleAnimations, changeFontFamily, changeLineSpacing,
    resetPreferences,
  } = useReadingPreferences();
  const [headerVisible, setHeaderVisible] = useState(true);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isAuthor = useMemo(() => user !== null && role === 'admin', [user, role]);
  const { prevChapter, nextChapter } = useMemo(() => {
    if (!allChapters) return { prevChapter: null, nextChapter: null };
    const sortedChapters = [...allChapters].sort((a, b) => a.chapter_number - b.chapter_number);
    const currentIndex = sortedChapters.findIndex(ch => ch.chapter_number === chapterNumber);
    if (currentIndex === -1) return { prevChapter: null, nextChapter: null };
    const prev = currentIndex > 0 ? sortedChapters[currentIndex - 1] : null;
    const next = currentIndex < sortedChapters.length - 1 ? sortedChapters[currentIndex + 1] : null;
    return { prevChapter: prev, nextChapter: next };
  }, [allChapters, chapterNumber]);


  // --- Data Fetching Effects ---

  // Effect 1: Fetch Novel Details and Chapter List
   useEffect(() => {
    if (isNaN(novelId) || novelId <= 0) {
      setPageError("Invalid Novel ID.");
      return;
    }
    let isMounted = true;
    // Reset state when novelId changes
    setPageError(null);
    setNovel(null);
    setAllChapters(null);
    setCurrentChapter(null);
    console.log(`[ChapterPage] Fetching novel (${novelId}) details and chapter list.`);
    Promise.all([getNovel(novelId), getNovelChapters(novelId)])
      .then(([fetchedNovel, fetchedChapters]) => {
        if (!isMounted) return;
        if (!fetchedNovel) throw new Error('Novel not found');
        setNovel(fetchedNovel);
        setAllChapters(fetchedChapters || []);
        console.log(`[ChapterPage] Novel (${novelId}) and chapters list loaded.`);
      })
      .catch((error: any) => {
        if (!isMounted) return;
        console.error('Error loading novel details or chapter list:', error);
        const message = error.message || 'Failed to load novel data.';
        setPageError(message); // Set page error
        toast.error(`Error: ${message}`);
        if (message.includes('not found')) router.push(`/`);
      });
    return () => { isMounted = false; };
  }, [novelId, router]); // Only depends on novelId and router

  // Effect 2: Fetch Specific Chapter Content
  useEffect(() => {
    // Don't run if novel/list haven't loaded or if there was a previous page error
    if (!novel || !allChapters || pageError) {
      return;
    }
    // Validate chapter number
    if (isNaN(chapterNumber) || chapterNumber <= 0) {
      setPageError("Invalid Chapter Number.");
      return;
    }
    // Check if chapter exists in the list
    const chapterMeta = allChapters.find(ch => ch.chapter_number === chapterNumber);
    if (!chapterMeta) {
        setPageError("Chapter not found in this novel.");
        setCurrentChapter(null); // Ensure chapter is null if not found
        return;
    }

    let isMounted = true;
    setPageError(null); // Clear previous content errors for this fetch attempt
    setCurrentChapter(null); // Clear old content immediately before fetch
    console.log(`[ChapterPage] Fetching content for Chapter ${chapterNumber} (Novel ${novelId})`);
    const userId = user?.id ?? null;

    getChapter(novelId, chapterNumber, userId)
      .then((fetchedChapterData) => {
        if (!isMounted) return;
        if (!fetchedChapterData) {
          // Chapter exists but content is inaccessible (likely locked)
          setCurrentChapter({ ...chapterMeta, content: null });
        } else {
          // Chapter loaded successfully
          setCurrentChapter(fetchedChapterData);
        }
      })
      .catch((error: any) => {
        if (!isMounted) return;
        console.error(`Error loading content for chapter ${chapterNumber}:`, error);
        const message = error.message || `Failed to load Chapter ${chapterNumber}.`;
        setPageError(message); // Set error state for content fetch failure
        toast.error(`Error: ${message}`);
      })
      .finally(() => {
        if (!isMounted) return;
        console.log(`[ChapterPage] Content fetch finished for Chapter ${chapterNumber}`);
      });
      return () => { isMounted = false; };
  // Depend on novel/list readiness, chapter number, user ID, and pageError state
  }, [novel, allChapters, chapterNumber, novelId, user?.id, pageError]);

  // --- Other Effects (UI, Preferences, Scrolling, Keyboard) --- (Keep as before)
  useEffect(() => { // Apply reading preferences
    const root = document.documentElement;
    root.style.setProperty('--reading-line-height', lineSpacing.toString());
    root.style.setProperty('--reading-font-family', fontFamily);
    root.style.setProperty('--reading-font-size', textSize === 'sm' ? '0.9rem' : textSize === 'md' ? '1rem' : textSize === 'lg' ? '1.1rem' : '1.2rem');
    root.classList.toggle('disable-animations', !animationsEnabled);
    document.body.classList.toggle('focus-mode-wrapper', isFocusMode);
    return () => {
      root.style.removeProperty('--reading-line-height');
      root.style.removeProperty('--reading-font-family');
      root.style.removeProperty('--reading-font-size');
      root.classList.remove('disable-animations');
      document.body.classList.remove('focus-mode-wrapper');
    };
  }, [animationsEnabled, lineSpacing, fontFamily, textSize, isFocusMode]);

  useEffect(() => { // Keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
       const target = e.target as HTMLElement;
       if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
       if (e.key === 'Escape') {
         if (showSettingsMenu) setShowSettingsMenu(false);
         else if (isFocusMode) setIsFocusMode(false);
         else setHeaderVisible(true);
         return;
       }
       if (e.key === 's' && !e.ctrlKey && !e.metaKey && !e.altKey) { setShowSettingsMenu(prev => !prev); return; }
       if (e.key === 'f' && !e.ctrlKey && !e.metaKey && !e.altKey) { setIsFocusMode(prev => !prev); return; }
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
         return;
       }
       if (!e.ctrlKey && !e.metaKey && !e.altKey && !showSettingsMenu) {
         if (e.key === 'ArrowLeft' && prevChapter) router.push(`/novels/${novelId}/chapter/${prevChapter.chapter_number}`);
         else if (e.key === 'ArrowRight' && nextChapter) router.push(`/novels/${novelId}/chapter/${nextChapter.chapter_number}`);
       }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [ showSettingsMenu, setShowSettingsMenu, textSize, changeTextSize, isFocusMode, setIsFocusMode, router, novelId, prevChapter, nextChapter ]);

  useEffect(() => { // Scroll detection
    const handleScroll = () => {
      setIsScrolling(true);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => setIsScrolling(false), 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  // --- Render Logic ---

  // Render error screen first if a page-level error occurred
  // This check happens before the main structure rendering
  if (pageError) {
      const novelTitleForError = novel?.title ?? `Novel ID ${novelId}`;
      const returnUrlOnError = novel ? `/novels/${novelId}` : '/';
      const returnTextOnError = novel ? `Back to ${novel.title}` : 'Back to Home';
      return <NotFoundScreen message={`Error: ${pageError}`} returnUrl={returnUrlOnError} returnText={returnTextOnError} />;
  }

  // Main Render - Render structure immediately, children handle null data with skeletons
  // The initial spinner is GONE from here.
  return (
    <div key={novelId} className={cn("reading-page", { 'focus-mode': isFocusMode })}>
        {/* Header: Renders skeleton if novel/currentChapter is null */}
        {!isFocusMode && (
            <ReadingHeader
                novel={novel} // Pass potentially null novel
                chapter={currentChapter} // Pass potentially null chapter
                isAuthor={isAuthor}
                visible={headerVisible}
                setVisible={setHeaderVisible}
                showSettingsMenu={showSettingsMenu}
                setShowSettingsMenu={setShowSettingsMenu}
                effectsEnabled={effectsEnabled}
            />
        )}

        {/* Settings Menu (Renders conditionally based on its own state) */}
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

        {/* Use min-height to prevent layout shifts */}
        <main className="min-h-screen bg-background text-foreground pt-16 md:pt-20 pb-24">
            <div className="max-w-4xl mx-auto px-4 md:px-8">
              {/* Chapter Title: Render skeleton if currentChapter is null */}
              {currentChapter ? (
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-8">
                     Chapter {currentChapter.chapter_number}: {currentChapter.title}
                  </h1>
              ) : novel && allChapters ? ( // Only show skeleton if novel/list loaded but chapter hasn't
                  <div className="h-8 bg-muted rounded w-3/4 mb-8 animate-pulse"></div>
              ): null /* Don't show skeleton if novel/list haven't loaded */ }

              {/* Reading View: Handles its own skeleton/locked/content states */}
              <ReadingView
                  key={currentChapter?.id ?? 'initial-view'} // Key forces remount/animation
                  chapter={currentChapter} // Pass chapter or null
                  isAuthor={isAuthor}
                  isEditing={false}
                  textSize={textSize}
                  effectsEnabled={effectsEnabled}
              />

              {/* Comments Section: Render only if chapter exists and novelId is valid */}
              {currentChapter && novelId && (
                  <Suspense fallback={<CommentsFallback />}>
                     <ChapterComments chapterId={currentChapter.id} novelId={novelId} />
                  </Suspense>
              )}
            </div>
        </main>

         {/* Floating Controls: Renders null if data is missing */}
         <FloatingReadingControls
              novelId={novelId}
              currentChapterNumber={chapterNumber}
              currentChapterId={currentChapter?.id ?? null}
              allChapters={allChapters}
              isScrolling={isScrolling}
          />
    </div>
  );
}