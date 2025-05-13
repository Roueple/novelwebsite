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
import type { Chapter, Novel } from '@/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import FloatingReadingControls from '@/components/reading/FloatingReadingControls';
import DirectChapterNavigation from '@/components/reading/DirectChapterNavigation';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { useTheme } from '@/providers/theme-provider';

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

const AUTO_HIDE_DELAY = 3500;

export default function ChapterPage() {
  const { user, role, loading: authLoading, ensureProfileLoaded, profileLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const novelId = Number(params.id);
  const chapterNumber = Number(params.chapterId);

  const [novel, setNovel] = useState<Novel | null>(null);
  const [allChapters, setAllChapters] = useState<Chapter[] | null>(null);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null | undefined>(undefined);
  const [pageError, setPageError] = useState<string | null>(null);
  const [initialDataLoading, setInitialDataLoading] = useState(true);
  const [chapterContentLoading, setChapterContentLoading] = useState(false);

  const { theme } = useTheme();
  const {
    textSize, effectsEnabled, animationsEnabled, fontFamily, lineSpacing,
    showSettingsMenu, settingsMenuRef, setShowSettingsMenu, changeTextSize,
    toggleEffects, toggleAnimations, changeFontFamily, changeLineSpacing,
    resetPreferences,
  } = useReadingPreferences();

  const [uiVisible, setUiVisible] = useState(true);
  const autoHideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);

  const isAuthor = useMemo(() => user !== null && role === 'admin', [user, role]);

  useEffect(() => {
    let isMounted = true;
    if (isNaN(novelId) || novelId <= 0) {
      if (isMounted) {
        setPageError("Invalid Novel ID.");
        setInitialDataLoading(false);
      }
      return;
    }

    console.log(`[ChapterPage] Fetching novel (${novelId}) details and chapter list.`);
    if (isMounted) {
      setInitialDataLoading(true);
      setPageError(null);
      setNovel(null);
      setAllChapters(null);
      setCurrentChapter(undefined);
    }

    Promise.all([getNovel(novelId), getNovelChapters(novelId)])
      .then(([fetchedNovel, fetchedChapters]) => {
        if (!isMounted) return;
        if (!fetchedNovel) {
          throw new Error('Novel not found.');
        }
        setNovel(fetchedNovel);
        setAllChapters(fetchedChapters || []);
        console.log(`[ChapterPage] Novel (${novelId}) and chapters list loaded.`);
      })
      .catch((error: any) => {
        if (!isMounted) return;
        console.error('[ChapterPage] Error loading novel details or chapter list:', error);
        const message = error.message || 'Failed to load novel data.';
        setPageError(message);
        toast.error(`Error: ${message}`);
        if (message.includes('not found')) {
            if (novelId) router.push(`/novels/${novelId}`);
            else router.push('/');
        }
      })
      .finally(() => {
        if (isMounted) setInitialDataLoading(false);
      });

    return () => { isMounted = false; };
  }, [novelId, router]);

  useEffect(() => {
    let isMounted = true;

    if (initialDataLoading || !novel || !allChapters || pageError) {
      if (!initialDataLoading && !novel && !pageError && isMounted) {
        // setPageError("Novel data missing, cannot load chapter."); // Avoid setting error if already errored or just loading
      }
      return;
    }

    if (isNaN(chapterNumber) || chapterNumber <= 0) {
      if (isMounted) {
        setPageError("Invalid Chapter Number.");
        setCurrentChapter(null);
      }
      return;
    }

    const chapterMeta = allChapters.find(ch => ch.chapter_number === chapterNumber);
    if (!chapterMeta) {
      if (isMounted) {
        setPageError("Chapter not found in this novel.");
        setCurrentChapter(null);
      }
      return;
    }

    if (isMounted) {
      setChapterContentLoading(true);
      setPageError(null);
      setCurrentChapter(undefined);
    }

    console.log(`[ChapterPage] Fetching content for Chapter ${chapterNumber} (Novel ${novelId})`);
    const currentAuthUserId = user?.id ?? null; // Correctly use user from useAuth()

    const performGetChapter = async () => {
      let canAccessLocked = isAuthor;
      if (chapterMeta.is_locked && !isAuthor) {
        if (!authLoading && !profileLoading && role === null && user) {
          console.log("[ChapterPage] Locked chapter, user exists, role not loaded. Ensuring profile.");
          await ensureProfileLoaded();
          // After ensureProfileLoaded, this effect will re-run due to role/profileLoading changes.
          // The access check will happen in the subsequent run.
          // We set chapterContentLoading to false here to allow re-evaluation if profile is loaded quickly.
          if (isMounted) setChapterContentLoading(false); // Allow re-evaluation
          return; // Exit this run, wait for re-run with updated auth state
        }
        // Re-check role after potential ensureProfileLoaded finishes in a subsequent run
        if (role === 'admin') canAccessLocked = true;
      }

      try {
        const fetchedChapterData = await getChapter(novelId, chapterNumber, currentAuthUserId);
        if (!isMounted) return;

        if (fetchedChapterData) {
          if (fetchedChapterData.is_locked && fetchedChapterData.content === null && !canAccessLocked) {
            console.log(`[ChapterPage] User not authorized for locked chapter ${chapterNumber}. Content is null.`);
            setCurrentChapter({ ...chapterMeta, content: null });
          } else {
            setCurrentChapter(fetchedChapterData);
          }
        } else {
          setPageError(`Failed to load content for Chapter ${chapterNumber}.`);
          setCurrentChapter(null);
        }
      } catch (error: any) {
        if (!isMounted) return;
        console.error(`[ChapterPage] Error loading content for chapter ${chapterNumber}:`, error);
        const message = error.message || `Failed to load Chapter ${chapterNumber}.`;
        setPageError(message);
        toast.error(`Error: ${message}`);
        setCurrentChapter(null);
      } finally {
        if (isMounted) setChapterContentLoading(false);
      }
    };

    performGetChapter();

    return () => { isMounted = false; };
  }, [
    novel, allChapters, chapterNumber, novelId, initialDataLoading, pageError,
    user, role, authLoading, profileLoading, ensureProfileLoaded, isAuthor
  ]);

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

  const { prevChapter, nextChapter } = useMemo(() => {
    if (!allChapters) return { prevChapter: null, nextChapter: null };
    const sortedChapters = [...allChapters].sort((a, b) => a.chapter_number - b.chapter_number);
    const currentIndex = sortedChapters.findIndex(ch => ch.chapter_number === chapterNumber);
    if (currentIndex === -1) return { prevChapter: null, nextChapter: null };
    const prev = currentIndex > 0 ? sortedChapters[currentIndex - 1] : null;
    const next = currentIndex < sortedChapters.length - 1 ? sortedChapters[currentIndex + 1] : null;
    return { prevChapter: prev, nextChapter: next };
  }, [allChapters, chapterNumber]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        if (showSettingsMenu) setShowSettingsMenu(false);
        else if (!uiVisible) {
          setUiVisible(true);
          if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
          autoHideTimerRef.current = setTimeout(() => setUiVisible(false), AUTO_HIDE_DELAY);
        }
        return;
      }
      if (e.key === 's' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        setShowSettingsMenu(prev => !prev);
        setUiVisible(true);
        if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
        e.preventDefault();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && !showSettingsMenu) {
        if (e.key === '+' || e.key === '=') { e.preventDefault(); if (textSize === 'sm') changeTextSize('md'); else if (textSize === 'md') changeTextSize('lg'); else if (textSize === 'lg') changeTextSize('xl');}
        else if (e.key === '-') { e.preventDefault(); if (textSize === 'xl') changeTextSize('lg'); else if (textSize === 'lg') changeTextSize('md'); else if (textSize === 'md') changeTextSize('sm');}
        return;
      }
      if (!e.ctrlKey && !e.metaKey && !e.altKey && !showSettingsMenu && uiVisible) {
        if (e.key === 'ArrowLeft' && prevChapter && novelId) { router.push(`/novels/${novelId}/chapter/${prevChapter.chapter_number}`); e.preventDefault(); }
        else if (e.key === 'ArrowRight' && nextChapter && novelId) { router.push(`/novels/${novelId}/chapter/${nextChapter.chapter_number}`); e.preventDefault(); }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSettingsMenu, setShowSettingsMenu, textSize, changeTextSize, uiVisible, router, novelId, prevChapter, nextChapter]);

  useEffect(() => {
    const mainEl = mainContentRef.current;
    if (!mainEl) return;
    const handleInteraction = (event: MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('button, a, input, textarea, [role="dialog"], [role="menu"]')) {
        if (uiVisible) {
          if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
          autoHideTimerRef.current = setTimeout(() => setUiVisible(false), AUTO_HIDE_DELAY);
        }
        return;
      }
      setUiVisible(currentVisibility => {
        const nextVisibility = !currentVisibility;
        if (autoHideTimerRef.current) { clearTimeout(autoHideTimerRef.current); autoHideTimerRef.current = null; }
        if (nextVisibility) {
          autoHideTimerRef.current = setTimeout(() => { setUiVisible(false); }, AUTO_HIDE_DELAY);
        }
        return nextVisibility;
      });
    };
    mainEl.addEventListener('click', handleInteraction);
    return () => {
      mainEl.removeEventListener('click', handleInteraction);
      if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
    };
  }, [mainContentRef, uiVisible]); // uiVisible as dependency for re-attaching if logic depends on it

  if (pageError) {
    const returnUrlOnError = novelId && novel ? `/novels/${novelId}` : '/';
    const returnTextOnError = novelId && novel ? `Back to ${novel.title || 'Novel'}` : 'Back to Home';
    return <NotFoundScreen message={`Error: ${pageError}`} returnUrl={returnUrlOnError} returnText={returnTextOnError} />;
  }

  const isLoadingPage = initialDataLoading || authLoading || (currentChapter === undefined && (chapterContentLoading || profileLoading) );

  if (isLoadingPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
        <p className="ml-3 text-muted-foreground">Loading chapter...</p>
      </div>
    );
  }

  if (!novel || !allChapters) {
    // This case should ideally be caught by pageError if getNovel/getNovelChapters fails and sets it.
    return <NotFoundScreen message="Novel data could not be loaded. The novel may not exist or there was an issue." returnUrl="/" returnText="Back to Home" />;
  }

  return (
    <div className={cn("min-h-screen", theme === 'reading' ? 'reading' : '')}>
      {uiVisible && novel && (currentChapter !== undefined) && (
        <ReadingHeader
          novel={novel}
          chapter={currentChapter} // Can be null if locked and not authorized after loading
          isAuthor={isAuthor}
          visible={true}
          setVisible={setUiVisible}
          showSettingsMenu={showSettingsMenu}
          setShowSettingsMenu={setShowSettingsMenu}
          effectsEnabled={effectsEnabled}
        />
      )}

      {uiVisible && (
        <ReadingSettingsMenu
          isOpen={showSettingsMenu} onClose={() => setShowSettingsMenu(false)} menuRef={settingsMenuRef}
          textSize={textSize} onChangeTextSize={changeTextSize}
          effectsEnabled={effectsEnabled} onToggleEffects={toggleEffects}
          animationsEnabled={animationsEnabled} onToggleAnimations={toggleAnimations}
          fontFamily={fontFamily} onChangeFontFamily={changeFontFamily}
          lineSpacing={lineSpacing} onChangeLineSpacing={changeLineSpacing}
          onResetPreferences={resetPreferences}
        />
      )}

      <main ref={mainContentRef} className="bg-background text-foreground pt-16 md:pt-20 pb-28 focus:outline-none" tabIndex={-1}>
        <div className="max-w-4xl mx-auto px-4 md:px-8">
          {currentChapter === undefined || (chapterContentLoading && !currentChapter) ? ( // Show skeleton if specific chapter content is loading AND currentChapter isn't set yet
            <div className="h-8 bg-muted rounded w-3/4 mb-8 animate-pulse"></div>
          ) : currentChapter ? ( // currentChapter is loaded (could have null content if locked)
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-8">
              Chapter {currentChapter.chapter_number}: {currentChapter.title}
            </h1>
          ) : ( // currentChapter is explicitly null (not found, error, or invalid number)
            <h1 className="text-2xl sm:text-3xl font-bold text-destructive mb-8">
              Chapter content not available or not found.
            </h1>
          )}

          <ReadingView
            key={currentChapter?.id ?? (chapterContentLoading ? 'loading-view-placeholder' : 'no-chapter-view')}
            chapter={currentChapter === undefined ? null : currentChapter} // Pass null if undefined
            isAuthor={isAuthor}
            isEditing={false}
            textSize={textSize}
            effectsEnabled={effectsEnabled}
          />

          {currentChapter?.id && novelId && (
            <Suspense fallback={<CommentsFallback />}>
              <ChapterComments chapterId={currentChapter.id} novelId={novelId} />
            </Suspense>
          )}
        </div>
      </main>

      {uiVisible && novelId && (
        <>
          <FloatingReadingControls
            novelId={novelId}
            currentChapterNumber={chapterNumber}
            currentChapterId={currentChapter?.id ?? null}
            allChapters={allChapters}
          />
          <DirectChapterNavigation
            novelId={novelId}
            prevChapter={prevChapter}
            nextChapter={nextChapter}
            isScrolling={false}
          />
        </>
      )}
    </div>
  );
}