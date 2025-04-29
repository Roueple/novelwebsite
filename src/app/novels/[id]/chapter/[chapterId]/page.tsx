// src/app/novels/[id]/chapter/[chapterId]/page.tsx
"use client";

// --- Imports --- (Keep all previous imports)
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
import LoadingSpinner from '@/components/ui/loading-spinner';

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
  // --- Hooks and State --- (Keep all previous state declarations)
  const { user, role, loading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const novelId = Number(params.id);
  const chapterNumber = Number(params.chapterId);

  const [novel, setNovel] = useState<Novel | null>(null);
  const [allChapters, setAllChapters] = useState<ChapterType[] | null>(null);
  const [currentChapter, setCurrentChapter] = useState<ChapterType | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

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

  // Effect 1: Fetch Novel Details and Chapter List (No change needed)
  useEffect(() => {
    if (isNaN(novelId) || novelId <= 0 || authLoading) {
        if (isNaN(novelId) || novelId <= 0) {
            setPageError("Invalid Novel ID.");
            setInitialLoading(false);
        }
      return;
    }
    let isMounted = true;
    setInitialLoading(true);
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
        setPageError(message);
        toast.error(`Error: ${message}`);
        if (message.includes('not found')) router.push(`/`);
        setInitialLoading(false);
      });
    return () => { isMounted = false; };
  }, [novelId, authLoading, router]);

  // Effect 2: Fetch Specific Chapter Content (*** DEPENDENCY ARRAY MODIFIED ***)
  useEffect(() => {
    if (!novel || !allChapters || pageError) {
      return;
    }
    if (isNaN(chapterNumber) || chapterNumber <= 0) {
      setPageError("Invalid Chapter Number.");
      setInitialLoading(false);
      setContentLoading(false);
      return;
    }
    const chapterMeta = allChapters.find(ch => ch.chapter_number === chapterNumber);
    if (!chapterMeta) {
        setPageError("Chapter not found in this novel.");
        setCurrentChapter(null);
        setInitialLoading(false);
        setContentLoading(false);
        return;
    }
    let isMounted = true;
    if (!initialLoading) setContentLoading(true);
    setPageError(null);
    setCurrentChapter(null);
    console.log(`[ChapterPage] Fetching content for Chapter ${chapterNumber} (Novel ${novelId})`);
    const userId = user?.id ?? null; // Get user ID

    getChapter(novelId, chapterNumber, userId)
      .then((fetchedChapterData) => {
        if (!isMounted) return;
        if (!fetchedChapterData) {
          console.log(`[ChapterPage] Content for locked chapter ${chapterNumber} inaccessible for user ${userId || 'Anonymous'}. Using metadata.`);
          setCurrentChapter({ ...chapterMeta, content: null });
        } else {
          console.log(`[ChapterPage] Content loaded for Chapter ${chapterNumber}. Locked: ${fetchedChapterData.is_locked}, Content Present: ${!!fetchedChapterData.content}`);
          setCurrentChapter(fetchedChapterData);
        }
      })
      .catch((error: any) => {
        if (!isMounted) return;
        console.error(`Error loading content for chapter ${chapterNumber}:`, error);
        const message = error.message || `Failed to load Chapter ${chapterNumber}.`;
        setPageError(message);
        toast.error(`Error: ${message}`);
      })
      .finally(() => {
        if (!isMounted) return;
        setInitialLoading(false);
        setContentLoading(false);
        console.log(`[ChapterPage] Content fetch finished for Chapter ${chapterNumber}`);
      });
      return () => { isMounted = false; };

  // *** MODIFIED DEPENDENCY ARRAY ***
  // Only depend on the user's ID, not the whole user object.
  // Also depend on novel, allChapters, chapterNumber, novelId, initialLoading, pageError.
  }, [novel, allChapters, chapterNumber, novelId, user?.id, initialLoading, pageError]);
  // *** END MODIFICATION ***

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

  // --- Render Logic --- (Keep as before)

  if (initialLoading || authLoading) {
       return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                 <LoadingSpinner size="lg" />
                 <p className="ml-3 text-muted-foreground">Loading novel...</p>
            </div>
       );
  }

  if (pageError) {
      return <NotFoundScreen message={pageError} returnUrl={`/novels/${novelId || ''}`} returnText="Back to Novel" />;
  }
  if (!novel) {
      return <NotFoundScreen message="Novel data could not be loaded." returnUrl={`/`} returnText="Back to Home"/>;
  }

  // Main Render (Keep as before)
  return (
    <div className={cn("reading-page", { 'focus-mode': isFocusMode })}>
        {!isFocusMode && novel && currentChapter && (
            <ReadingHeader
                novel={novel}
                chapter={currentChapter}
                isAuthor={isAuthor}
                visible={headerVisible}
                setVisible={setHeaderVisible}
                showSettingsMenu={showSettingsMenu}
                setShowSettingsMenu={setShowSettingsMenu}
                effectsEnabled={effectsEnabled}
            />
        )}

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

        <main className="min-h-screen bg-background text-foreground pt-16 md:pt-20 pb-24">
          {novel && (
            <div className="max-w-4xl mx-auto px-4 md:px-8">
              {currentChapter ? (
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-8">
                     Chapter {currentChapter.chapter_number}: {currentChapter.title}
                  </h1>
              ) : !contentLoading && pageError
                  ? ( <h1 className="text-2xl sm:text-3xl font-bold text-destructive mb-8"> Error Loading Chapter Title </h1> )
                  : null
              }

              <ReadingView
                  isLoading={contentLoading} // Pass the contentLoading state
                  content={currentChapter?.content ?? null}
                  isLocked={currentChapter?.is_locked ?? true}
                  isAuthor={isAuthor}
                  isEditing={false}
                  textSize={textSize}
                  effectsEnabled={effectsEnabled}
              />

              {currentChapter && (
                  <Suspense fallback={<CommentsFallback />}>
                     <ChapterComments chapterId={currentChapter.id} novelId={novelId} />
                  </Suspense>
              )}
            </div>
          )}
        </main>

         {novel && currentChapter && allChapters && (
            <FloatingReadingControls
                 novelId={novelId}
                 currentChapterNumber={chapterNumber}
                 currentChapterId={currentChapter.id}
                 allChapters={allChapters}
                 isScrolling={isScrolling}
             />
         )}
    </div>
  );
}