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

// Dynamic imports and fallbacks
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

const AUTO_HIDE_DELAY = 3500; // 3.5 seconds delay for auto-hide

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

  // UI Visibility State
  const [focusModeActive, setFocusModeActive] = useState(false); // Is focus mode enabled?
  const [uiVisible, setUiVisible] = useState(true); // Are controls currently shown?
  const autoHideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mainContentRef = useRef<HTMLDivElement>(null); // Ref for the main content area

  const isAuthor = useMemo(() => user !== null && role === 'admin', [user, role]);

  // Calculate Prev/Next Chapter
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
    // (Logic remains the same - fetch novel/chapter list)
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
    // (Logic remains the same - fetch current chapter content)
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

  // Apply reading preferences
  useEffect(() => {
    // (Logic remains the same - apply CSS vars, disable-animations class)
    const root = document.documentElement;
    root.style.setProperty('--reading-line-height', lineSpacing.toString());
    root.style.setProperty('--reading-font-family', fontFamily);
    root.style.setProperty('--reading-font-size', textSize === 'sm' ? '0.9rem' : textSize === 'md' ? '1rem' : textSize === 'lg' ? '1.1rem' : '1.2rem');
    root.classList.toggle('disable-animations', !animationsEnabled);
    return () => {
      root.style.removeProperty('--reading-line-height');
      root.style.removeProperty('--reading-font-family');
      root.style.removeProperty('--reading-font-size');
      root.classList.remove('disable-animations');
    };
  }, [animationsEnabled, lineSpacing, fontFamily, textSize]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
       const target = e.target as HTMLElement;
       // Ignore if typing in inputs/textareas
       if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

       if (e.key === 'Escape') {
         if (showSettingsMenu) {
             setShowSettingsMenu(false); // Close settings first
         } else if (focusModeActive && !uiVisible) {
             setUiVisible(true); // Show UI if hidden
             // Restart timer on manual reveal via Esc
             if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
             autoHideTimerRef.current = setTimeout(() => { setUiVisible(false); }, AUTO_HIDE_DELAY);
         } else if (focusModeActive && uiVisible) {
             setFocusModeActive(false); // Exit focus mode if UI is already visible
         }
         e.preventDefault(); // Prevent default Escape behavior
         return;
       }
       if (e.key === 's' && !e.ctrlKey && !e.metaKey && !e.altKey) {
           setShowSettingsMenu(prev => !prev); // Toggle settings
           e.preventDefault();
           return;
       }
       // Toggle focus mode enable/disable
       if (e.key === 'f' && !e.ctrlKey && !e.metaKey && !e.altKey) {
           setFocusModeActive(prev => {
               const nextState = !prev;
               if (!nextState) { // Exiting focus mode
                   setUiVisible(true); // Ensure UI is visible
                   if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current); // Clear timer
               } else { // Entering focus mode
                   setUiVisible(false); // Immediately hide UI
                   // Start timer automatically when entering focus mode via key
                   if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
                   autoHideTimerRef.current = setTimeout(() => { setUiVisible(false); }, AUTO_HIDE_DELAY);
               }
               return nextState;
           });
           e.preventDefault();
           return;
       }
       // Text size adjustments (only if settings menu is closed)
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
       // Chapter navigation (only if settings menu is closed and UI is visible)
       if (!e.ctrlKey && !e.metaKey && !e.altKey && !showSettingsMenu && uiVisible) {
         if (e.key === 'ArrowLeft' && prevChapter) {
             router.push(`/novels/${novelId}/chapter/${prevChapter.chapter_number}`);
             e.preventDefault();
         } else if (e.key === 'ArrowRight' && nextChapter) {
             router.push(`/novels/${novelId}/chapter/${nextChapter.chapter_number}`);
             e.preventDefault();
         }
       }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [ showSettingsMenu, setShowSettingsMenu, textSize, changeTextSize, focusModeActive, uiVisible, router, novelId, prevChapter, nextChapter ]); // Include uiVisible

  // Click/Tap Listener for Focus Mode UI Reveal/Hide Timer Reset
  useEffect(() => {
    const mainEl = mainContentRef.current;
    if (!mainEl || !focusModeActive) {
      // If not in focus mode, ensure timer is cleared and UI is visible
      if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
      setUiVisible(true); // Keep UI visible when not in focus mode
      return;
    }

    // Function to handle interaction: show UI and reset timer
    const handleInteraction = () => {
      if (!uiVisible) {
        setUiVisible(true); // Show UI immediately if hidden
      }
      // Clear existing timer and start a new one
      if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current);
      }
      autoHideTimerRef.current = setTimeout(() => {
        // Only hide if focus mode is still active when timer fires
        if (focusModeActive) {
            setUiVisible(false);
        }
      }, AUTO_HIDE_DELAY);
    };

    // Attach listeners to the main content area
    mainEl.addEventListener('click', handleInteraction);
    mainEl.addEventListener('mousemove', handleInteraction);

    // Initial hide when focus mode effect runs (or if already active)
    // But only if UI isn't already meant to be visible (e.g. just toggled focus mode)
    if (focusModeActive && uiVisible) {
       // If focus mode just got activated AND ui is still visible, start timer to hide it
       handleInteraction();
    } else if (focusModeActive && !uiVisible) {
        // If focus mode is active and UI should be hidden, ensure it is
        setUiVisible(false);
        if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current); // Clear timer if already hidden
    }


    // Cleanup
    return () => {
      mainEl.removeEventListener('click', handleInteraction);
      mainEl.removeEventListener('mousemove', handleInteraction);
      if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current);
      }
    };
    // Rerun when focus mode state changes OR uiVisible changes (to manage timer correctly)
  }, [focusModeActive, uiVisible]);


  // --- Render Logic ---
  if (pageError) {
      const returnUrlOnError = novel ? `/novels/${novelId}` : '/';
      const returnTextOnError = novel ? `Back to ${novel.title}` : 'Back to Home';
      return <NotFoundScreen message={`Error: ${pageError}`} returnUrl={returnUrlOnError} returnText={returnTextOnError} />;
  }

  // Main Render
  return (
    <div className={cn("reading", "min-h-screen")}> {/* Apply reading theme class */}
        {/* Conditionally render Header based on uiVisible */}
        {uiVisible && (
            <ReadingHeader
                novel={novel}
                chapter={currentChapter}
                isAuthor={isAuthor}
                visible={true} // Visibility controlled by parent conditional render
                setVisible={setUiVisible} // Can still allow header's hide button
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

        {/* Main Content - ADD REF HERE */}
        <main ref={mainContentRef} className="bg-background text-foreground pt-16 md:pt-20 pb-24 focus:outline-none" tabIndex={-1}> {/* Added ref and focus style */}
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
                isScrolling={false} // Hiding based on uiVisible, not scroll fade needed now
            />
         )}
    </div>
  );
}