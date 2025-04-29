// src/app/novels/[id]/chapter/[chapterId]/page.tsx
"use client";

// --- Imports ---
import { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { getChapter, getNovel, getNovelChapters } from '@/lib/api';
import ReadingHeader from '@/components/reading/reading-header';
import ReadingView from '@/components/reading/reading-view'; // Import corrected ReadingView
import ReadingSettingsMenu from '@/components/reading/reading-settings-menu';
import NotFoundScreen from '@/components/ui/not-found-screen';
import { useReadingPreferences } from '@/hooks/use-reading-preferences';
import type { ChapterType, Novel } from '@/types/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import FloatingReadingControls from '@/components/reading/FloatingReadingControls';
import LoadingSpinner from '@/components/ui/loading-spinner';

// Dynamically import comments component
const ChapterComments = dynamic(() => import('@/components/reading/ChapterComments'), { // [cite: 929]
  ssr: false,
  loading: () => <CommentsFallback />,
});

function CommentsFallback() { // [cite: 930]
    return ( // [cite: 931]
        <div className="mt-8 pt-6 border-t border-border">
            <h3 className="text-xl font-semibold mb-4 text-foreground">Comments</h3>
            <div className="flex justify-center items-center py-8">
                <LoadingSpinner size="md" />
                <span className="ml-2 text-muted-foreground">Loading comments section...</span>
            </div>
        </div>
    ); // [cite: 931]
} // [cite: 932]

export default function ChapterPage() {
  // --- Hooks and State ---
  const { user, role, loading: authLoading } = useAuth(); // [cite: 932, 933]
  const params = useParams(); // [cite: 933]
  const router = useRouter(); // [cite: 933]
  const novelId = Number(params.id); // [cite: 933, 934]
  const chapterNumber = Number(params.chapterId); // [cite: 934]

  // ** MODIFIED State **
  const [novel, setNovel] = useState<Novel | null>(null); // [cite: 938]
  const [allChapters, setAllChapters] = useState<ChapterType[] | null>(null); // [cite: 939]
  const [currentChapter, setCurrentChapter] = useState<ChapterType | null>(null); // [cite: 937]
  const [initialLoading, setInitialLoading] = useState(true); // [cite: 935]
  const [contentLoading, setContentLoading] = useState(false); // Loading for subsequent chapter content only // [cite: 935]
  const [pageError, setPageError] = useState<string | null>(null); // [cite: 935, 936]

  // Reading preferences hook
  const {
    textSize, effectsEnabled, animationsEnabled, fontFamily, lineSpacing,
    showSettingsMenu, settingsMenuRef, setShowSettingsMenu, changeTextSize,
    toggleEffects, toggleAnimations, changeFontFamily, changeLineSpacing,
    resetPreferences,
  } = useReadingPreferences(); // [cite: 942, 943]

  // UI state
  const [headerVisible, setHeaderVisible] = useState(true); // [cite: 939, 940]
  const [isFocusMode, setIsFocusMode] = useState(false); // [cite: 940]
  const [isScrolling, setIsScrolling] = useState(false); // [cite: 940, 941]
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null); // [cite: 941, 942]

  // Derived state
  const isAuthor = useMemo(() => user !== null && role === 'admin', [user, role]); // [cite: 943]
  const { prevChapter, nextChapter } = useMemo(() => { // [cite: 964, 965]
    if (!allChapters) return { prevChapter: null, nextChapter: null };
    const sortedChapters = [...allChapters].sort((a, b) => a.chapter_number - b.chapter_number);
    const currentIndex = sortedChapters.findIndex(ch => ch.chapter_number === chapterNumber);
    if (currentIndex === -1) return { prevChapter: null, nextChapter: null };
    const prev = currentIndex > 0 ? sortedChapters[currentIndex - 1] : null;
    const next = currentIndex < sortedChapters.length - 1 ? sortedChapters[currentIndex + 1] : null;
    return { prevChapter: prev, nextChapter: next }; // [cite: 965]
  }, [allChapters, chapterNumber]); // [cite: 966]

  // --- Data Fetching Effects ---

  // Effect 1: Fetch Novel Details and Chapter List
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

    Promise.all([getNovel(novelId), getNovelChapters(novelId)]) // [cite: 946]
      .then(([fetchedNovel, fetchedChapters]) => { // [cite: 947]
        if (!isMounted) return;
        if (!fetchedNovel) {
          throw new Error('Novel not found'); // [cite: 947]
        }
        setNovel(fetchedNovel);
        setAllChapters(fetchedChapters || []); // [cite: 948]
        console.log(`[ChapterPage] Novel (${novelId}) and chapters list loaded.`);
      })
      .catch((error: any) => {
        if (!isMounted) return;
        console.error('Error loading novel details or chapter list:', error);
        const message = error.message || 'Failed to load novel data.';
        setPageError(message);
        toast.error(`Error: ${message}`); // [cite: 957]
        if (message.includes('not found')) {
          router.push(`/`); // [cite: 958]
        }
        setInitialLoading(false);
      });

    return () => { isMounted = false; };

  }, [novelId, authLoading, router]);

  // Effect 2: Fetch Specific Chapter Content
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

    const chapterMeta = allChapters.find(ch => ch.chapter_number === chapterNumber); // [cite: 949]
    if (!chapterMeta) {
        setPageError("Chapter not found in this novel.");
        setCurrentChapter(null);
        setInitialLoading(false);
        setContentLoading(false);
        return;
    }

    let isMounted = true;
    if (!initialLoading) {
      setContentLoading(true);
    }
    setPageError(null);
    setCurrentChapter(null);

    console.log(`[ChapterPage] Fetching content for Chapter ${chapterNumber} (Novel ${novelId})`);
    const userId = user?.id ?? null; // [cite: 945]

    getChapter(novelId, chapterNumber, userId) // [cite: 946]
      .then((fetchedChapterData) => {
        if (!isMounted) return;

        if (!fetchedChapterData) {
          console.log(`[ChapterPage] Content for locked chapter ${chapterNumber} inaccessible for user ${userId || 'Anonymous'}. Using metadata.`);
          setCurrentChapter({ ...chapterMeta, content: null }); // [cite: 951]
        } else {
          console.log(`[ChapterPage] Content loaded for Chapter ${chapterNumber}. Locked: ${fetchedChapterData.is_locked}, Content Present: ${!!fetchedChapterData.content}`);
          setCurrentChapter(fetchedChapterData); // [cite: 955]
        }
      })
      .catch((error: any) => {
        if (!isMounted) return;
        console.error(`Error loading content for chapter ${chapterNumber}:`, error); // [cite: 956]
        const message = error.message || `Failed to load Chapter ${chapterNumber}.`;
        setPageError(message); // [cite: 957]
        toast.error(`Error: ${message}`);
      })
      .finally(() => {
        if (!isMounted) return;
        setInitialLoading(false); // [cite: 960]
        setContentLoading(false); // [cite: 960]
        console.log(`[ChapterPage] Content fetch finished for Chapter ${chapterNumber}`);
      });

      return () => { isMounted = false; };

  }, [novel, allChapters, chapterNumber, novelId, user, initialLoading, pageError]);

  // --- Other Effects (UI, Preferences, Scrolling, Keyboard) ---
  useEffect(() => { // Apply reading preferences // [cite: 962]
    const root = document.documentElement;
    root.style.setProperty('--reading-line-height', lineSpacing.toString());
    root.style.setProperty('--reading-font-family', fontFamily);
    root.style.setProperty('--reading-font-size', textSize === 'sm' ? '0.9rem' : textSize === 'md' ? '1rem' : textSize === 'lg' ? '1.1rem' : '1.2rem');
    root.classList.toggle('disable-animations', !animationsEnabled); // [cite: 962]
    document.body.classList.toggle('focus-mode-wrapper', isFocusMode); // [cite: 962]
    return () => {
      root.style.removeProperty('--reading-line-height');
      root.style.removeProperty('--reading-font-family');
      root.style.removeProperty('--reading-font-size');
      root.classList.remove('disable-animations');
      document.body.classList.remove('focus-mode-wrapper'); // [cite: 963]
    }; // [cite: 964]
  }, [animationsEnabled, lineSpacing, fontFamily, textSize, isFocusMode]);

  useEffect(() => { // Keyboard shortcuts // [cite: 966]
    const handleKeyDown = (e: KeyboardEvent) => {
       const target = e.target as HTMLElement;
       if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

       if (e.key === 'Escape') {
         if (showSettingsMenu) setShowSettingsMenu(false);
         else if (isFocusMode) setIsFocusMode(false); // [cite: 967]
         else setHeaderVisible(true);
         return;
       }
       if (e.key === 's' && !e.ctrlKey && !e.metaKey && !e.altKey) { setShowSettingsMenu(prev => !prev); return; } // [cite: 967]
       if (e.key === 'f' && !e.ctrlKey && !e.metaKey && !e.altKey) { setIsFocusMode(prev => !prev); return; } // [cite: 968]

       if ((e.ctrlKey || e.metaKey) && !showSettingsMenu) { // [cite: 968, 969]
         if (e.key === '+' || e.key === '=') {
            e.preventDefault(); // [cite: 969]
            if (textSize === 'sm') changeTextSize('md'); // [cite: 970]
            else if (textSize === 'md') changeTextSize('lg'); // [cite: 970]
            else if (textSize === 'lg') changeTextSize('xl'); // [cite: 970]
         } else if (e.key === '-') { // [cite: 971]
             e.preventDefault(); // [cite: 971]
             if (textSize === 'xl') changeTextSize('lg'); // [cite: 972]
             else if (textSize === 'lg') changeTextSize('md'); // [cite: 972]
             else if (textSize === 'md') changeTextSize('sm'); // [cite: 972]
         }
         return; // [cite: 974]
       }

       if (!e.ctrlKey && !e.metaKey && !e.altKey && !showSettingsMenu) { // [cite: 974]
         if (e.key === 'ArrowLeft' && prevChapter) {
            router.push(`/novels/${novelId}/chapter/${prevChapter.chapter_number}`); // [cite: 974]
         } else if (e.key === 'ArrowRight' && nextChapter) {
            router.push(`/novels/${novelId}/chapter/${nextChapter.chapter_number}`); // [cite: 975]
         }
       }
    }; // [cite: 976]
    window.addEventListener('keydown', handleKeyDown); // [cite: 977]
    return () => window.removeEventListener('keydown', handleKeyDown); // [cite: 977]
  }, [ // [cite: 978]
      showSettingsMenu, setShowSettingsMenu, textSize, changeTextSize, isFocusMode, setIsFocusMode,
      router, novelId, prevChapter, nextChapter
  ]); // [cite: 978]

  useEffect(() => { // Scroll detection // [cite: 979]
    const handleScroll = () => {
      setIsScrolling(true); // [cite: 979]
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false); // [cite: 980]
      }, 300);
    };
    window.addEventListener('scroll', handleScroll); // [cite: 980]
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
         clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []); // [cite: 981]

  // --- Render Logic ---

  if (initialLoading || authLoading) {
       return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                 <LoadingSpinner size="lg" />
                 <p className="ml-3 text-muted-foreground">Loading novel...</p>
            </div>
       ); // [cite: 981]
  }

  if (pageError) {
      return <NotFoundScreen message={pageError} returnUrl={`/novels/${novelId || ''}`} returnText="Back to Novel" />; // [cite: 982, 983]
  }
  if (!novel) {
      return <NotFoundScreen message="Novel data could not be loaded." returnUrl={`/`} returnText="Back to Home"/>; // [cite: 983, 984]
  }

  // Main Render
  return ( // [cite: 985]
    <div className={cn("reading-page", { 'focus-mode': isFocusMode })}>
        {!isFocusMode && novel && currentChapter && ( // Render header only if chapter metadata is available // [cite: 985]
            <ReadingHeader
                novel={novel} // [cite: 985]
                chapter={currentChapter} // Pass current chapter // [cite: 986]
                isAuthor={isAuthor} // [cite: 986]
                visible={headerVisible} // [cite: 986]
                setVisible={setHeaderVisible} // [cite: 986]
                showSettingsMenu={showSettingsMenu} // [cite: 986]
                setShowSettingsMenu={setShowSettingsMenu} // [cite: 986]
                effectsEnabled={effectsEnabled} // [cite: 986, 987]
            /> // [cite: 987]
        )}

        <ReadingSettingsMenu // [cite: 987]
          isOpen={showSettingsMenu} // [cite: 987]
          onClose={() => setShowSettingsMenu(false)} // [cite: 987]
          menuRef={settingsMenuRef} // [cite: 987]
          textSize={textSize} // [cite: 987]
          onChangeTextSize={changeTextSize}
          effectsEnabled={effectsEnabled} // [cite: 988]
          onToggleEffects={toggleEffects} // [cite: 988]
          animationsEnabled={animationsEnabled} // [cite: 988]
          onToggleAnimations={toggleAnimations} // [cite: 988]
          fontFamily={fontFamily} // [cite: 988]
          onChangeFontFamily={changeFontFamily} // [cite: 988]
          lineSpacing={lineSpacing} // [cite: 988]
          onChangeLineSpacing={changeLineSpacing} // [cite: 988]
          onResetPreferences={resetPreferences}
        /> // [cite: 988]

        <main className="min-h-screen bg-background text-foreground pt-16 md:pt-20 pb-24">
          {novel && ( // [cite: 989]
            <div className="max-w-4xl mx-auto px-4 md:px-8">
              {currentChapter ? (
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-8">
                     Chapter {currentChapter.chapter_number}: {currentChapter.title}
                  </h1> // [cite: 990]
              ) : !contentLoading && pageError
                  ? (
                      <h1 className="text-2xl sm:text-3xl font-bold text-destructive mb-8">
                          Error Loading Chapter Title
                      </h1>
                    )
                  : null
              }

              {/* Reading View Component - Pass contentLoading state */}
              <ReadingView
                  isLoading={contentLoading} // *** FIX: Pass the contentLoading state ***
                  content={currentChapter?.content ?? null} // [cite: 991, 992]
                  isLocked={currentChapter?.is_locked ?? true} // [cite: 992, 993]
                  isAuthor={isAuthor} // [cite: 993]
                  isEditing={false} // This is the reading page, not editing // [cite: 993]
                  textSize={textSize} // [cite: 993]
                  effectsEnabled={effectsEnabled}
              /> {/* [cite: 994] */}

              {/* Comments Section - Render only if currentChapter exists */}
              {currentChapter && ( // [cite: 994]
                  <Suspense fallback={<CommentsFallback />}> {/* [cite: 994] */}
                     <ChapterComments chapterId={currentChapter.id} novelId={novelId} /> {/* [cite: 995] */}
                  </Suspense> // [cite: 995]
              )}
            </div> // [cite: 995]
          )}
        </main>

         {novel && currentChapter && allChapters && ( // [cite: 996]
            <FloatingReadingControls
                 novelId={novelId} // [cite: 996]
                 currentChapterNumber={chapterNumber} // Use chapterNumber from params // [cite: 996]
                 currentChapterId={currentChapter.id} // Use actual chapter ID // [cite: 996]
                 allChapters={allChapters} // Pass the list of chapters // [cite: 997]
                 isScrolling={isScrolling} // Pass scroll state for opacity effect // [cite: 997]
             /> // [cite: 997]
         )}
    </div>
  ); // [cite: 998]
}