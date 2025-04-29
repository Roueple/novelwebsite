// src/app/novels/[id]/chapter/[chapterId]/page.tsx
"use client";
import { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider'; // Import useAuth
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
import LoadingSpinner from '@/components/ui/loading-spinner';

// Dynamically import comments component, disable SSR as it relies on client auth
const ChapterComments = dynamic(() => import('@/components/reading/ChapterComments'), {
  ssr: false
});

// Fallback UI for the comments section while it loads
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
  // Get user authentication state
  const { user, role, loading: authLoading } = useAuth();

  // Next.js hooks for routing and parameters
  const params = useParams();
  const router = useRouter();
  const novelId = Number(params.id);
  const chapterNumber = Number(params.chapterId);

  // Component state
  const [loading, setLoading] = useState(true); // Overall page loading state
  const [initialLoadError, setInitialLoadError] = useState<string | null>(null); // Error during initial data fetch
  const [chapter, setChapter] = useState<ChapterType | null>(null); // Current chapter data (content might be null)
  const [novel, setNovel] = useState<Novel | null>(null); // Novel metadata
  const [allChapters, setAllChapters] = useState<ChapterType[] | null>(null); // List of all chapters (metadata only)
  const [headerVisible, setHeaderVisible] = useState(true); // Reading header visibility
  const [isFocusMode, setIsFocusMode] = useState(false); // Focus mode state
  const [isScrolling, setIsScrolling] = useState(false); // Track scroll state for UI effects
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Ref for scroll timeout

  // Reading preferences hook
  const {
    textSize, effectsEnabled, animationsEnabled, fontFamily, lineSpacing,
    showSettingsMenu, settingsMenuRef, setShowSettingsMenu, changeTextSize,
    toggleEffects, toggleAnimations, changeFontFamily, changeLineSpacing,
    resetPreferences,
  } = useReadingPreferences();

  // Determine if the current user is the author (admin)
  const isAuthor = useMemo(() => user !== null && role === 'admin', [user, role]);

  // Callback function to load novel and chapter data
  const loadData = useCallback(async () => {
    // Wait for authentication check to complete before fetching
    if (authLoading) {
        console.log("[ChapterPage] Waiting for auth loading to complete...");
        return;
    }
    console.log("[ChapterPage] Auth loaded, proceeding to fetch data.");
    setLoading(true); // Set loading true for data fetch
    setInitialLoadError(null);
    setAllChapters(null); // Reset chapter list

    // Validate IDs
    if (isNaN(novelId) || isNaN(chapterNumber)) {
      setInitialLoadError('Invalid novel or chapter ID.');
      setLoading(false);
      toast.error('Invalid URL parameters.');
      router.push('/'); // Redirect home on invalid ID
      return;
    }

    try {
       // Get the current user's ID (or null if not logged in)
       const userId = user?.id ?? null;
       console.log(`[ChapterPage] Calling API functions with userId: ${userId}`);

       // Fetch novel metadata, specific chapter (with auth check), and chapter list concurrently
       const [novelData, chapterData, chaptersListData] = await Promise.all([
           getNovel(novelId), // Fetch novel metadata
           getChapter(novelId, chapterNumber, userId), // Fetch chapter, passing user ID for auth check
           getNovelChapters(novelId) // Fetch chapter list (metadata only)
       ]);

      // Handle novel not found
      if (!novelData) throw new Error('Novel not found');
      setNovel(novelData);

      // Handle chapter list
      setAllChapters(chaptersListData || []);

      // Handle chapter data (might be null if not found OR locked+unauthorized)
      if (!chapterData) {
          // Check if the chapter *exists* in the list but wasn't returned by getChapter
          const chapterExists = chaptersListData?.some(ch => ch.chapter_number === chapterNumber);
          if (chapterExists) {
              // Chapter exists, but user couldn't fetch content (likely locked)
              // Set chapter state with metadata but null content
              const existingChapterMeta = chaptersListData?.find(ch => ch.chapter_number === chapterNumber);
              setChapter({
                  ...(existingChapterMeta as ChapterType), // Use metadata from list
                  content: null // Explicitly set content to null
              });
              console.log(`[ChapterPage] Received null content for chapter ${chapterNumber}, likely locked and user unauthorized.`);
          } else {
              // Chapter truly doesn't exist
              throw new Error('Chapter not found');
          }
      } else {
          // Chapter data fetched successfully (content might be null if locked+unauthorized, handled by API)
          setChapter(chapterData);
          console.log(`[ChapterPage] Chapter ${chapterNumber} data loaded. Content is ${chapterData.content === null ? 'NULL' : 'PRESENT'}.`);
      }

    } catch (error: any) {
      // Handle errors during data fetching
      console.error('Error loading chapter page data:', error);
      const message = error.message || 'Failed to load chapter data.';
      setInitialLoadError(message);
      toast.error(`Error: ${message}`);
      // Redirect if resource not found
      if (message.includes('not found')) {
          router.push(`/novels/${novelId || ''}`);
      }
    } finally {
      // Ensure loading state is turned off
      setLoading(false);
    }
  // Depend on IDs and auth state
  }, [novelId, chapterNumber, router, authLoading, user]);

  // Trigger data load when component mounts or dependencies change
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Effect to apply reading preferences to the document
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--reading-line-height', lineSpacing.toString());
    root.style.setProperty('--reading-font-family', fontFamily);
    // Map text size state to CSS font size (example)
    root.style.setProperty('--reading-font-size', textSize === 'sm' ? '0.9rem' : textSize === 'md' ? '1rem' : textSize === 'lg' ? '1.1rem' : '1.2rem');
    // Toggle animation disabling class
    root.classList.toggle('disable-animations', !animationsEnabled);
    // Toggle focus mode class on body
    document.body.classList.toggle('focus-mode-wrapper', isFocusMode);
    // Cleanup function to remove styles/classes on unmount
    return () => {
      root.style.removeProperty('--reading-line-height');
      root.style.removeProperty('--reading-font-family');
      root.style.removeProperty('--reading-font-size');
      root.classList.remove('disable-animations');
      document.body.classList.remove('focus-mode-wrapper');
    };
  }, [animationsEnabled, lineSpacing, fontFamily, textSize, isFocusMode]);

  // Memoize previous and next chapter calculation
  const { prevChapter, nextChapter } = useMemo(() => {
    if (!allChapters) return { prevChapter: null, nextChapter: null };
    // Ensure chapters are sorted by chapter_number
    const sortedChapters = [...allChapters].sort((a, b) => a.chapter_number - b.chapter_number);
    const currentIndex = sortedChapters.findIndex(ch => ch.chapter_number === chapterNumber);
    if (currentIndex === -1) return { prevChapter: null, nextChapter: null }; // Current chapter not found in list
    // Find previous and next chapters based on index
    const prev = currentIndex > 0 ? sortedChapters[currentIndex - 1] : null;
    const next = currentIndex < sortedChapters.length - 1 ? sortedChapters[currentIndex + 1] : null;
    return { prevChapter: prev, nextChapter: next };
  }, [allChapters, chapterNumber]);

  // Effect for keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
       // Ignore shortcuts if focus is within an input/textarea
       const target = e.target as HTMLElement;
       if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

       // Escape key handling
       if (e.key === 'Escape') {
         if (showSettingsMenu) setShowSettingsMenu(false); // Close settings first
         else if (isFocusMode) setIsFocusMode(false); // Exit focus mode next
         else setHeaderVisible(true); // Ensure header is visible if nothing else is active
         return;
       }
       // 's' key for settings toggle
       if (e.key === 's' && !e.ctrlKey && !e.metaKey && !e.altKey) { setShowSettingsMenu(prev => !prev); return; }
       // 'f' key for focus mode toggle
       if (e.key === 'f' && !e.ctrlKey && !e.metaKey && !e.altKey) { setIsFocusMode(prev => !prev); return; }

       // Ctrl/Cmd + Plus/Minus for text size (only if settings menu is closed)
       if ((e.ctrlKey || e.metaKey) && !showSettingsMenu) {
         if (e.key === '+' || e.key === '=') { // Plus key
            e.preventDefault();
            if (textSize === 'sm') changeTextSize('md');
            else if (textSize === 'md') changeTextSize('lg');
            else if (textSize === 'lg') changeTextSize('xl');
          } else if (e.key === '-') { // Minus key
             e.preventDefault();
            if (textSize === 'xl') changeTextSize('lg');
            else if (textSize === 'lg') changeTextSize('md');
            else if (textSize === 'md') changeTextSize('sm');
         }
         return;
       }

       // Arrow keys for chapter navigation (only if settings menu is closed)
       if (!e.ctrlKey && !e.metaKey && !e.altKey && !showSettingsMenu) {
         if (e.key === 'ArrowLeft' && prevChapter) {
            router.push(`/novels/${novelId}/chapter/${prevChapter.chapter_number}`);
         } else if (e.key === 'ArrowRight' && nextChapter) {
            router.push(`/novels/${novelId}/chapter/${nextChapter.chapter_number}`);
         }
       }
    };
    // Add event listener
    window.addEventListener('keydown', handleKeyDown);
    // Cleanup listener on unmount
    return () => window.removeEventListener('keydown', handleKeyDown);
  // Dependencies for keyboard shortcuts
  }, [
      showSettingsMenu, setShowSettingsMenu, textSize, changeTextSize, isFocusMode, setIsFocusMode,
      router, novelId, prevChapter, nextChapter
  ]);

  // Effect to detect scrolling and manage timeout for UI feedback
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolling(true); // Set scrolling state to true
      // Clear existing timeout if user scrolls again quickly
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      // Set a new timeout to reset scrolling state after a delay
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 300); // Reset after 300ms of no scrolling
    };
    // Add scroll event listener
    window.addEventListener('scroll', handleScroll);
    // Cleanup function
    return () => {
      window.removeEventListener('scroll', handleScroll);
      // Clear timeout if component unmounts
      if (scrollTimeoutRef.current) {
         clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []); // No dependencies needed for scroll listener setup

  // --- Loading and Error Rendering ---
  // Show loading screen if initial data fetch or auth check is in progress
  if (loading || authLoading) {
      return <LoadingScreen message="Loading chapter..." />;
  }
  // Show error screen if initial load failed
  if (initialLoadError) {
      return <NotFoundScreen message={initialLoadError} returnUrl={`/novels/${novelId || ''}`} returnText="Back to Novel" />;
  }
  // Show error screen if novel data is missing after loading
  if (!novel) {
      return <NotFoundScreen message="Novel data could not be loaded." returnUrl={`/`} returnText="Back to Home"/>;
  }
  // Note: We proceed even if `chapter` is null, as `ReadingView` handles the locked/null content state.

  // --- Main Render ---
  return (
    <div className={cn("reading-page", { 'focus-mode': isFocusMode })}>
        {/* Reading Header - Conditionally rendered */}
        {!isFocusMode && novel && chapter && ( // Render header only if chapter metadata is available
            <ReadingHeader
                novel={novel}
                chapter={chapter} // Pass the chapter data
                isAuthor={isAuthor}
                visible={headerVisible}
                setVisible={setHeaderVisible}
                showSettingsMenu={showSettingsMenu}
                setShowSettingsMenu={setShowSettingsMenu}
                effectsEnabled={effectsEnabled}
            />
        )}

        {/* Settings Menu - Always available but visibility controlled by state */}
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

        {/* Main Content Area */}
        <main className="min-h-screen bg-background text-foreground pt-16 md:pt-20 pb-24">
          {/* Check if novel data exists before rendering content */}
          {novel && (
            <div className="max-w-4xl mx-auto px-4 md:px-8">
                {/* Chapter Title - Render only if chapter metadata exists */}
                {chapter && (
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-8">
                     Chapter {chapter.chapter_number}: {chapter.title}
                  </h1>
                )}

                {/* Reading View Component */}
                <ReadingView
                    // Pass content (can be null if locked/unauthorized)
                    content={chapter?.content ?? null}
                    // Pass lock status (default to true if chapter is null, meaning inaccessible)
                    isLocked={chapter?.is_locked ?? true}
                    isAuthor={isAuthor}
                    isEditing={false} // This is the reading page, not editing
                    textSize={textSize}
                    effectsEnabled={effectsEnabled}
                />

                {/* Comments Section - Render only if chapter data exists */}
                {chapter && (
                  <Suspense fallback={<CommentsFallback />}>
                     {/* Lazy-loaded comments component */}
                     <ChapterComments chapterId={chapter.id} novelId={novelId} />
                  </Suspense>
                )}
            </div>
          )}
        </main>

         {/* Floating Controls - Render only if chapter data exists */}
         {novel && chapter && allChapters && (
            <FloatingReadingControls
                 novelId={novelId}
                 currentChapterNumber={chapterNumber} // Use chapterNumber from params
                 currentChapterId={chapter.id} // Use actual chapter ID
                 allChapters={allChapters} // Pass the list of chapters
                 isScrolling={isScrolling} // Pass scroll state for opacity effect
             />
         )}
    </div>
  );
}