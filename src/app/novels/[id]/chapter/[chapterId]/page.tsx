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

  // Simplified UI Visibility State
  const [uiVisible, setUiVisible] = useState(true); // Start with UI visible
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
    if (isNaN(novelId) || novelId <= 0) {
        setPageError("Invalid Novel ID.");
        return;
    }
    let isMounted = true;
    // Reset state for new novel/chapter
    setPageError(null); setNovel(null); setAllChapters(null); setCurrentChapter(null);
    setUiVisible(true); // Ensure UI is visible when loading new chapter/novel
    if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current); // Clear timer

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
        setPageError(message);
        toast.error(`Error: ${message}`);
        if (message.includes('not found')) router.push(`/`);
      });
    return () => { isMounted = false; };
  }, [novelId, router]); // Depend only on novelId

  // Effect 2: Fetch Specific Chapter Content
  useEffect(() => {
     if (!novel || !allChapters || pageError) return;
     if (isNaN(chapterNumber) || chapterNumber <= 0) {
         setPageError("Invalid Chapter Number.");
         setCurrentChapter(null); // Clear chapter if number is invalid
         return;
     }
     const chapterMeta = allChapters.find(ch => ch.chapter_number === chapterNumber);
     if (!chapterMeta) {
         setPageError("Chapter not found in this novel.");
         setCurrentChapter(null);
         return;
     }

     let isMounted = true;
     setPageError(null);
     setCurrentChapter(null); // Clear previous chapter content before fetch
     setUiVisible(true); // Ensure UI is visible when new chapter content starts loading
     if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);

     console.log(`[ChapterPage] Fetching content for Chapter ${chapterNumber} (Novel ${novelId})`);
     const userId = user?.id ?? null;

     getChapter(novelId, chapterNumber, userId)
      .then((fetchedChapterData) => {
        if (!isMounted) return;
        // Set chapter data (with null content if locked and not authorized)
        setCurrentChapter(fetchedChapterData ? fetchedChapterData : { ...chapterMeta, content: null });
        // Start timer to hide UI after initial load (if applicable later)
        // For now, we start visible. User clicks to hide first.
      })
      .catch((error: any) => {
        if (!isMounted) return;
        console.error(`Error loading content for chapter ${chapterNumber}:`, error);
        const message = error.message || `Failed to load Chapter ${chapterNumber}.`;
        setPageError(message);
        toast.error(`Error: ${message}`);
      });

     return () => { isMounted = false; };
  }, [novel, allChapters, chapterNumber, novelId, user?.id, pageError]); // Depend on chapterNumber


  // --- UI Interaction Effects ---

  // Apply reading preferences
  useEffect(() => {
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
       if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

       // Escape: Close Settings Menu OR Show UI if hidden
       if (e.key === 'Escape') {
         e.preventDefault();
         if (showSettingsMenu) {
             setShowSettingsMenu(false);
         } else if (!uiVisible) {
             setUiVisible(true); // Show UI
             // Restart timer when showing UI via Escape
             if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
             autoHideTimerRef.current = setTimeout(() => setUiVisible(false), AUTO_HIDE_DELAY);
         }
         return;
       }
       // S: Toggle Settings Menu
       if (e.key === 's' && !e.ctrlKey && !e.metaKey && !e.altKey) {
           setShowSettingsMenu(prev => !prev);
           setUiVisible(true); // Ensure UI is visible when opening settings
           if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current); // Stop auto-hide when opening settings
           e.preventDefault();
           return;
       }
       // Ctrl/Cmd + +/-: Text size adjustments (only if settings menu is closed)
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
       // Arrow Keys: Chapter navigation (only if UI is visible)
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
  }, [ showSettingsMenu, setShowSettingsMenu, textSize, changeTextSize, uiVisible, router, novelId, prevChapter, nextChapter ]); // Removed fullscreen dependencies


  // Click Listener for UI Hide/Show Toggle and Auto-Hide
  useEffect(() => {
    const mainEl = mainContentRef.current;
    if (!mainEl) return; // Don't attach if ref is not ready

    const handleInteraction = (event: MouseEvent | TouchEvent) => {
      // Ignore clicks on interactive elements within the UI itself
      const target = event.target as HTMLElement;
      if (target.closest('button, a, input, textarea, [role="dialog"], [role="menu"]')) {
        // If the click was on an interactive element or inside a menu/dialog,
        // maybe reset the timer but don't toggle visibility.
         if (uiVisible) {
            if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
            autoHideTimerRef.current = setTimeout(() => setUiVisible(false), AUTO_HIDE_DELAY);
         }
        return;
      }

      // Toggle UI visibility
      setUiVisible(currentVisibility => {
          const nextVisibility = !currentVisibility;
          // Clear any existing timer
          if (autoHideTimerRef.current) {
              clearTimeout(autoHideTimerRef.current);
              autoHideTimerRef.current = null;
          }
          // If revealing the UI, start the auto-hide timer
          if (nextVisibility) {
              autoHideTimerRef.current = setTimeout(() => {
                  setUiVisible(false); // Hide after delay
              }, AUTO_HIDE_DELAY);
          }
          return nextVisibility; // Return the new state
      });
    };

    // Use 'click' for both mouse clicks and taps on touch devices
    mainEl.addEventListener('click', handleInteraction);

    // Cleanup
    return () => {
      mainEl.removeEventListener('click', handleInteraction);
      if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current);
      }
    };
    // Rerun only if the main element ref changes (shouldn't happen often)
    // We manage the uiVisible state *inside* the handler now.
  }, [mainContentRef.current]);


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
                visible={true} // Pass true, parent controls rendering
                setVisible={setUiVisible} // Allow header's hide button to set state
                showSettingsMenu={showSettingsMenu}
                setShowSettingsMenu={setShowSettingsMenu}
                effectsEnabled={effectsEnabled}
            />
        )}

        {/* Settings Menu (visibility controlled by its own state, rendered if uiVisible) */}
        {uiVisible && (
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
        )}

        {/* Main Content - Attach Ref */}
        {/* Add padding-bottom to ensure content isn't hidden behind floating buttons when visible */}
        <main ref={mainContentRef} className="bg-background text-foreground pt-16 md:pt-20 pb-28 focus:outline-none" tabIndex={-1}>
            <div className="max-w-4xl mx-auto px-4 md:px-8">
              {/* Chapter Title Skeleton/Display */}
              {currentChapter ? (
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-8">
                     Chapter {currentChapter.chapter_number}: {currentChapter.title}
                  </h1>
              ) : novel && allChapters ? (
                  <div className="h-8 bg-muted rounded w-3/4 mb-8 animate-pulse"></div>
              ): (
                  // Optional: Add a main loading spinner if nothing is loaded yet
                  <div className="flex justify-center items-center min-h-[50vh]">
                      <LoadingSpinner size="lg" />
                  </div>
              )}

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
                isScrolling={false} // Can remove isScrolling if not needed
            />
         )}
    </div>
  );
}