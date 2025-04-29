// src/app/novels/[id]/chapter/[chapterId]/page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { getChapter, getNovel, getNovelChapters } from '@/lib/api';
import ReadingHeader from '@/components/reading/reading-header';
import ReadingView from '@/components/reading/reading-view';
import ReadingSettingsMenu from '@/components/reading/reading-settings-menu';
import NotFoundScreen from '@/components/ui/not-found-screen';
import { useReadingPreferences } from '@/hooks/use-reading-preferences';
import type { ChapterType, Novel } from '@/types/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import FloatingReadingControls from '@/components/reading/FloatingReadingControls';
import DirectChapterNavigation from '@/components/reading/DirectChapterNavigation';
import LoadingSpinner from '@/components/ui/loading-spinner';

// Dynamic imports and fallbacks remain the same
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

const AUTO_HIDE_DELAY = 3000; // 3 seconds

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
  const [pageError, setPageError] = useState<string | null>(null);
  const {
    textSize, effectsEnabled, animationsEnabled, fontFamily, lineSpacing,
    showSettingsMenu, settingsMenuRef, setShowSettingsMenu, changeTextSize,
    toggleEffects, toggleAnimations, changeFontFamily, changeLineSpacing,
    resetPreferences,
  } = useReadingPreferences();
  // NEW State for UI visibility
  const [uiVisible, setUiVisible] = useState(true);
  const [focusModeActive, setFocusModeActive] = useState(false); // To enable/disable the hide/show behavior
  const autoHideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isAuthor = useMemo(() => user !== null && role === 'admin', [user, role]);

  // Calculate Prev/Next Chapter
  const { prevChapter, nextChapter } = useMemo(() => {
    // (Logic remains the same as before)
    if (!allChapters) return { prevChapter: null, nextChapter: null };
    const sortedChapters = [...allChapters].sort((a, b) => a.chapter_number - b.chapter_number);
    const currentIndex = sortedChapters.findIndex(ch => ch.chapter_number === chapterNumber);
    if (currentIndex === -1) return { prevChapter: null, nextChapter: null };
    const prev = currentIndex > 0 ? sortedChapters[currentIndex - 1] : null;
    const next = currentIndex < sortedChapters.length - 1 ? sortedChapters[currentIndex + 1] : null;
    return { prevChapter: prev, nextChapter: next };
  }, [allChapters, chapterNumber]);

  // --- Data Fetching Effects (remain the same) ---
  // Effect 1: Fetch Novel Details and Chapter List
  useEffect(() => {
    // (Logic remains the same as before)
    if (isNaN(novelId) || novelId <= 0) { setPageError("Invalid Novel ID."); return; }
    let isMounted = true;
    setPageError(null); setNovel(null); setAllChapters(null); setCurrentChapter(null);
    Promise.all([getNovel(novelId), getNovelChapters(novelId)])
      .then(([fetchedNovel, fetchedChapters]) => {
        if (!isMounted) return; if (!fetchedNovel) throw new Error('Novel not found');
        setNovel(fetchedNovel); setAllChapters(fetchedChapters || []);
      })
      .catch((error: any) => {
        if (!isMounted) return; const message = error.message || 'Failed to load novel data.';
        setPageError(message); toast.error(`Error: ${message}`);
        if (message.includes('not found')) router.push(`/`);
      });
    return () => { isMounted = false; };
  }, [novelId, router]);

  // Effect 2: Fetch Specific Chapter Content
  useEffect(() => {
    // (Logic remains the same as before)
     if (!novel || !allChapters || pageError) return;
     if (isNaN(chapterNumber) || chapterNumber <= 0) { setPageError("Invalid Chapter Number."); return; }
     const chapterMeta = allChapters.find(ch => ch.chapter_number === chapterNumber);
     if (!chapterMeta) { setPageError("Chapter not found in this novel."); setCurrentChapter(null); return; }
     let isMounted = true; setPageError(null); setCurrentChapter(null);
     const userId = user?.id ?? null;
     getChapter(novelId, chapterNumber, userId)
      .then((fetchedChapterData) => {
        if (!isMounted) return;
        setCurrentChapter(fetchedChapterData ? fetchedChapterData : { ...chapterMeta, content: null });
      })
      .catch((error: any) => {
        if (!isMounted) return; const message = error.message || `Failed to load Chapter ${chapterNumber}.`;
        setPageError(message); toast.error(`Error: ${message}`);
      });
     return () => { isMounted = false; };
  }, [novel, allChapters, chapterNumber, novelId, user?.id, pageError]);

  // --- UI Interaction Effects ---

  // Apply reading preferences (Removed focus-mode class logic)
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--reading-line-height', lineSpacing.toString());
    root.style.setProperty('--reading-font-family', fontFamily);
    root.style.setProperty('--reading-font-size', textSize === 'sm' ? '0.9rem' : textSize === 'md' ? '1rem' : textSize === 'lg' ? '1.1rem' : '1.2rem');
    root.classList.toggle('disable-animations', !animationsEnabled);
    // Removed: document.body.classList.toggle('focus-mode-wrapper', isFocusMode);
    return () => {
      root.style.removeProperty('--reading-line-height');
      root.style.removeProperty('--reading-font-family');
      root.style.removeProperty('--reading-font-size');
      root.classList.remove('disable-animations');
      // Removed: document.body.classList.remove('focus-mode-wrapper');
    };
  }, [animationsEnabled, lineSpacing, fontFamily, textSize]);

  // Keyboard shortcuts (updated 'f' key for focus mode)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
       const target = e.target as HTMLElement;
       if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
       if (e.key === 'Escape') {
         if (showSettingsMenu) setShowSettingsMenu(false);
         else if (focusModeActive && !uiVisible) setUiVisible(true); // Show UI if hidden
         else if (focusModeActive && uiVisible) setFocusModeActive(false); // Exit focus mode if UI visible
         return;
       }
       if (e.key === 's' && !e.ctrlKey && !e.metaKey && !e.altKey) { setShowSettingsMenu(prev => !prev); return; }
       // Toggle focus mode enable/disable
       if (e.key === 'f' && !e.ctrlKey && !e.metaKey && !e.altKey) {
           setFocusModeActive(prev => !prev);
           setUiVisible(true); // Always show UI when toggling focus mode state
           if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current); // Clear timer when exiting focus mode
           return;
       }
       // Text size adjustments (remain the same)
       if ((e.ctrlKey || e.metaKey) && !showSettingsMenu) {
         if (e.key === '+' || e.key === '=') { /* ... */ }
         else if (e.key === '-') { /* ... */ }
         return;
       }
       // Chapter navigation (remain the same)
       if (!e.ctrlKey && !e.metaKey && !e.altKey && !showSettingsMenu && uiVisible) { // Only allow nav if UI visible
         if (e.key === 'ArrowLeft' && prevChapter) router.push(`/novels/${novelId}/chapter/${prevChapter.chapter_number}`);
         else if (e.key === 'ArrowRight' && nextChapter) router.push(`/novels/${novelId}/chapter/${nextChapter.chapter_number}`);
       }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [ showSettingsMenu, setShowSettingsMenu, textSize, changeTextSize, focusModeActive, uiVisible, router, novelId, prevChapter, nextChapter ]);

  // Click/Tap Listener for Focus Mode UI Reveal
  useEffect(() => {
    const handleInteraction = () => {
      if (focusModeActive) {
        // If UI is hidden, show it and start the timer
        if (!uiVisible) {
          setUiVisible(true);
        }
        // Always clear existing timer and start a new one on interaction
        if (autoHideTimerRef.current) {
          clearTimeout(autoHideTimerRef.current);
        }
        autoHideTimerRef.current = setTimeout(() => {
          setUiVisible(false); // Hide UI after delay
        }, AUTO_HIDE_DELAY);
      }
    };

    // Attach listeners only when focus mode is active
    if (focusModeActive) {
      document.body.addEventListener('click', handleInteraction);
      document.body.addEventListener('mousemove', handleInteraction); // Also reset timer on mouse move
      // Initial hide when focus mode is activated
      handleInteraction(); // Start the timer immediately
    } else {
        // Ensure UI is visible when focus mode is deactivated
        setUiVisible(true);
        if (autoHideTimerRef.current) {
             clearTimeout(autoHideTimerRef.current); // Clean up timer if focus mode is turned off
        }
    }

    // Cleanup
    return () => {
      document.body.removeEventListener('click', handleInteraction);
      document.body.removeEventListener('mousemove', handleInteraction);
      if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current);
      }
    };
  }, [focusModeActive, uiVisible]); // Rerun when focus mode state changes


  // --- Render Logic ---
  if (pageError) {
      const returnUrlOnError = novel ? `/novels/${novelId}` : '/';
      const returnTextOnError = novel ? `Back to ${novel.title}` : 'Back to Home';
      return <NotFoundScreen message={`Error: ${pageError}`} returnUrl={returnUrlOnError} returnText={returnTextOnError} />;
  }

  // Main Render
  return (
    // Apply reading class for theme variables
    <div className={cn("reading", "min-h-screen")}>
        {/* Conditionally render Header based on uiVisible */}
        {uiVisible && (
            <ReadingHeader
                novel={novel}
                chapter={currentChapter}
                isAuthor={isAuthor}
                visible={true} // Controlled by parent now
                setVisible={setUiVisible} // Allow header's hide button to control parent state
                showSettingsMenu={showSettingsMenu}
                setShowSettingsMenu={setShowSettingsMenu}
                effectsEnabled={effectsEnabled}
            />
        )}

        {/* Settings Menu (visibility controlled by its own state) */}
        <ReadingSettingsMenu
          isOpen={showSettingsMenu}
          onClose={() => setShowSettingsMenu(false)}
          menuRef={settingsMenuRef}
          textSize={textSize} onChangeTextSize={changeTextSize}
          effectsEnabled={effectsEnabled} onToggleEffects={toggleEffects}
          animationsEnabled={animationsEnabled} onToggleAnimations={toggleAnimations}
          fontFamily={fontFamily} onChangeFontFamily={changeFontFamily}
          lineSpacing={lineSpacing} onChangeLineSpacing={changeLineSpacing}
          onResetPreferences={resetPreferences}
        />

        {/* Main Content */}
        <main className="bg-background text-foreground pt-16 md:pt-20 pb-24">
            <div className="max-w-4xl mx-auto px-4 md:px-8">
              {/* Chapter Title Skeleton */}
              {currentChapter ? (
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-8">
                     Chapter {currentChapter.chapter_number}: {currentChapter.title}
                  </h1>
              ) : novel && allChapters ? (
                  <div className="h-8 bg-muted rounded w-3/4 mb-8 animate-pulse"></div>
              ): null}

              {/* Reading View */}
              <ReadingView
                  key={currentChapter?.id ?? 'initial-view'}
                  chapter={currentChapter}
                  isAuthor={isAuthor}
                  isEditing={false}
                  textSize={textSize}
                  effectsEnabled={effectsEnabled}
              />

              {/* Comments Section */}
              {currentChapter && novelId && (
                  <Suspense fallback={<CommentsFallback />}>
                     <ChapterComments chapterId={currentChapter.id} novelId={novelId} />
                  </Suspense>
              )}
            </div>
        </main>

         {/* Conditionally render Floating Controls (Sheet FAB) based on uiVisible */}
         {uiVisible && (
             <FloatingReadingControls
                  novelId={novelId}
                  currentChapterNumber={chapterNumber}
                  currentChapterId={currentChapter?.id ?? null}
                  allChapters={allChapters}
              />
         )}

         {/* Conditionally render Direct Chapter Navigation based on uiVisible */}
         {uiVisible && (
            <DirectChapterNavigation
                novelId={novelId}
                prevChapter={prevChapter}
                nextChapter={nextChapter}
                isScrolling={false} // Let parent handle scroll state if needed, or remove prop
            />
         )}

         {/* Optional: Button to toggle focus mode manually */}
         {/* <button
             onClick={() => setFocusModeActive(prev => !prev)}
             className="fixed bottom-20 left-6 z-50 p-2 bg-secondary rounded-full shadow"
             title={focusModeActive ? "Exit Focus Mode (F)" : "Enter Focus Mode (F)"}
         >
             {focusModeActive ? "Exit" : "Focus"}
         </button> */}
    </div>
  );
}