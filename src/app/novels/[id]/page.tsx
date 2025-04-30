// src/app/novels/[id]/page.tsx (Corrected View-Only Version with useEffect fix)
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { BookOpen, Edit, Lock } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getNovel, getNovelChapters } from '@/lib/api';
import type { Novel, ChapterType } from '@/types/supabase';
import Image from 'next/image';
import { useAuth } from '@/providers/auth-provider';
import NotFoundScreen from '@/components/ui/not-found-screen';
import { Button } from '@/components/ui/button';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { cn } from '@/lib/utils';

// --- Skeleton Components (with return statements) ---
function ChaptersSkeleton() {
    return ( <div className="space-y-1 animate-pulse"> { [...Array(8)].map((_, i) => ( <div key={i} className="flex items-center justify-between p-2 rounded-md h-8 bg-muted/50"></div> ))} </div> );
}
function LeftColumnSkeleton() {
    return ( <div className="md:col-span-1 space-y-4 animate-pulse"> <div className="relative aspect-[2/3] w-full bg-muted rounded-lg shadow-lg"></div> <div className="space-y-3 bg-card p-4 rounded-lg shadow border border-border/10"> <div className="flex items-center justify-between"> <div className="h-4 bg-muted rounded w-1/4"></div> <div className="h-4 bg-muted rounded w-1/6"></div> </div> <div className="flex items-center justify-between"> <div className="h-4 bg-muted rounded w-1/4"></div> <div className="h-5 w-1/5 bg-muted rounded-full"></div> </div> <div className="pt-1 space-y-2"> <div className="h-4 bg-muted rounded w-1/5 mb-1"></div> <div className="flex flex-wrap gap-1"> <div className="h-5 w-12 bg-muted rounded-full"></div> <div className="h-5 w-16 bg-muted rounded-full"></div> <div className="h-5 w-14 bg-muted rounded-full"></div> </div> </div> </div> </div> );
}
function RightColumnSkeleton() {
    return ( <div className="md:col-span-2 space-y-6 animate-pulse"> <div className="bg-card rounded-lg shadow p-6 border border-border/10 space-y-3"> <div className="flex justify-between items-start"> <div className="h-8 bg-muted rounded w-3/4"></div> <div className="h-8 w-8 bg-muted rounded-md"></div> </div> <div className="h-4 bg-muted rounded w-1/4"></div> <div className="space-y-2 pt-2"> <div className="h-4 bg-muted rounded w-full"></div> <div className="h-4 bg-muted rounded w-full"></div> <div className="h-4 bg-muted rounded w-5/6"></div> </div> </div> <div className="bg-card rounded-lg shadow p-6 border border-border/10"> <div className="h-6 bg-muted rounded w-1/3 mb-4"></div> <ChaptersSkeleton /> </div> </div> );
}
// --- END Skeletons ---

export default function NovelPageView() {
  // Hooks and State
  const { user, role, loading: authLoading } = useAuth();
  const params = useParams();
  const novelIdParam = params.id;
  const [novelId, setNovelId] = useState<number | null>(null);
  const [novel, setNovel] = useState<Novel | null>(null);
  const [chapters, setChapters] = useState<ChapterType[] | null>(null);
  const [dataLoading, setDataLoading] = useState(true); // Initialize as true
  const [loadError, setLoadError] = useState<string | null>(null);

  // Derived State
  const isAuthor = useMemo(() => user !== null && role === 'admin', [user, role]);

  // Effect to set novelId based on route parameter
  useEffect(() => {
    const id = Number(novelIdParam);
    if (!isNaN(id) && id > 0) {
        // Only update if the ID actually changes to prevent unnecessary state updates
        if (id !== novelId) {
            console.log(`[NovelPageView Refresh Debug] Route Param Changed/Set: New ID = ${id}`);
            setNovelId(id);
            // Reset dependent states when ID changes
            setNovel(null);
            setChapters(null);
            setLoadError(null);
            setDataLoading(true); // Set loading true when ID changes
        }
    } else {
        if (novelId !== null || !loadError) { // Prevent setting error repeatedly
             console.error(`[NovelPageView Refresh Debug] Invalid Novel ID in URL: ${novelIdParam}`);
             setLoadError("Invalid Novel ID provided in URL.");
             setDataLoading(false);
             setNovelId(null);
             setNovel(null);
             setChapters(null);
        }
    }
  }, [novelIdParam, novelId, loadError]); // Added loadError to prevent repeated error setting

  // Effect to fetch novel and chapter data
  const loadNovelAndChapters = useCallback(async () => {
    // This check should ideally prevent calls if novelId is null, but adding extra safety
    if (novelId === null) {
        console.warn("[NovelPageView Refresh Debug] loadNovelAndChapters called with null novelId. Aborting.");
        return;
    }
    console.log(`[NovelPageView Refresh Debug] loadNovelAndChapters EXECUTION START. novelId: ${novelId}`);
    // Ensure loading state is true when fetching starts
    if (!dataLoading) setDataLoading(true);
    setLoadError(null); // Clear previous errors before fetching

    try {
        const [novelData, chaptersData] = await Promise.all([
            getNovel(novelId),
            getNovelChapters(novelId)
        ]);
        console.log("[NovelPageView Refresh Debug] Fetched data:", { novelData: !!novelData, chaptersCount: chaptersData?.length });

        if (novelData) {
            setNovel(novelData);
            setChapters(chaptersData || []);
            setLoadError(null); // Clear error on success
        } else {
            console.log(`[NovelPageView Refresh Debug] Novel ${novelId} not found by API.`);
            setLoadError("Novel not found or failed to load.");
            setNovel(null);
            setChapters(null);
        }
    } catch (err: any) {
        console.error("[NovelPageView] Error during data fetch:", err);
        setLoadError(err.message || "An unexpected error occurred while loading data.");
        setNovel(null);
        setChapters(null);
    } finally {
        setDataLoading(false); // Set loading false *after* fetch attempt (success or fail)
        console.log("[NovelPageView Refresh Debug] loadNovelAndChapters EXECUTION END.");
    }
  }, [novelId, dataLoading]); // Removed authLoading dependency here, handled in the trigger effect

  // Effect to *trigger* the data fetch when conditions are right
  useEffect(() => {
    console.log(`[NovelPageView Refresh Debug] useEffect trigger check. novelId: ${novelId}, authLoading: ${authLoading}, dataLoading: ${dataLoading}, novelLoaded: ${!!novel}, loadError: ${loadError}`);

    // --- Conditions to START fetching ---
    // 1. We have a valid novelId.
    // 2. Auth loading is finished.
    // 3. We don't currently have novel data loaded.
    // 4. There isn't already an error preventing loading.
    // 5. We aren't already in the middle of loading data (dataLoading is false).
    if (novelId !== null && !authLoading && !novel && !loadError && !dataLoading) {
        console.log("[NovelPageView Refresh Debug] Conditions met, calling loadNovelAndChapters.");
        loadNovelAndChapters();
    }
    // --- Condition to SHOW skeleton ---
    // If auth is loading OR we don't have an ID yet, AND there's no load error,
    // ensure dataLoading is true so skeleton shows.
    else if ((authLoading || novelId === null) && !loadError) {
        if (!dataLoading) { // Only set if not already true
            console.log("[NovelPageView Refresh Debug] Setting dataLoading to true (auth pending or no ID).");
            setDataLoading(true);
        }
    } else {
         console.log("[NovelPageView Refresh Debug] Conditions not met for fetch call OR setting dataLoading this cycle.");
    }
  // Dependencies: trigger changes if ID, auth status change.
  // loadNovelAndChapters is memoized.
  // novel and loadError are included to re-evaluate if we *need* to fetch again.
  // dataLoading is included to check if a fetch is already in progress.
  }, [novelId, authLoading, loadNovelAndChapters, novel, loadError, dataLoading]);


  // Sorted Chapters
  const displayedChapters = useMemo(() => {
    if (!chapters) return [];
    return [...chapters].sort((a, b) => a.chapter_number - b.chapter_number);
  }, [chapters]);

  // Render Logic
  // Prioritize showing error screen if a load error occurred (and not invalid ID from URL initially)
  if (loadError && !loadError.includes("Invalid Novel ID")) {
      return <NotFoundScreen message={`Error: ${loadError}`} returnUrl="/" returnText="Return to Home"/>;
  }
  // Show invalid ID screen if URL param was bad
  if (loadError?.includes("Invalid Novel ID")) {
      return <NotFoundScreen message={loadError} returnUrl="/" returnText="Return to Home" />;
  }

  // Determine if skeleton should be shown (initial load state)
  const showSkeletons = dataLoading && !novel && !loadError;

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column */}
          {showSkeletons ? <LeftColumnSkeleton /> : novel ? (
            <div className="md:col-span-1">
              <div className="relative aspect-[2/3] w-full mb-4 shadow-lg rounded-lg overflow-hidden border border-border/10">
                 {!novel.cover_url ? ( <div className="absolute inset-0 bg-muted flex items-center justify-center"><BookOpen className="h-16 w-16 text-muted-foreground/50" /></div> ) : ( <Image src={novel.cover_url} alt={`Cover for ${novel.title}`} fill sizes="(max-width: 768px) 100vw, 33vw" quality={85} priority className="object-cover" placeholder="blur" blurDataURL="/placeholder-cover-blur.png" onError={(e) => { e.currentTarget.src = '/placeholder-cover.png'; e.currentTarget.srcset = ''; }}/> )}
              </div>
              <div className="space-y-3 text-sm bg-card p-4 rounded-lg shadow border border-border/10">
                 <div className="flex items-center justify-between"> <span className="font-medium text-muted-foreground">Rating</span> <span className="text-yellow-500 font-semibold">★ {novel.rating?.toFixed(1) ?? 'N/A'}</span> </div>
                 <div className="flex items-center justify-between"> <span className="font-medium text-muted-foreground">Status</span> <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${ novel.status === 'Ongoing' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' }`}> {novel.status} </span> </div>
                 <div className="pt-1"> <span className="font-medium text-muted-foreground mb-1 block">Tags</span> <div className="flex flex-wrap gap-1 "> {novel.tags?.map((tag) => (<span key={tag} className="px-2 py-0.5 text-xs rounded-full bg-secondary text-secondary-foreground">{tag}</span>))} {(!novel.tags || novel.tags.length === 0) && <span className="text-xs text-muted-foreground italic">No tags</span>} </div> </div>
              </div>
            </div>
          ) : null }

          {/* Right Column */}
          {showSkeletons ? <RightColumnSkeleton /> : novel ? (
            <div className="md:col-span-2 space-y-6">
              {/* Title and Description Section */}
              <div className="bg-card rounded-lg shadow p-6 border border-border/10">
                 <div>
                    <div className="flex justify-between items-start mb-2">
                         <h1 className="text-2xl md:text-3xl font-bold text-foreground">{novel.title}</h1>
                         {isAuthor && (
                            <Button variant="ghost" size="icon" asChild className="text-muted-foreground hover:text-foreground" aria-label="Edit novel details">
                               <Link href={`/novels/${novelId}/edit`}> <Edit size={18} /> </Link>
                            </Button>
                         )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">by {novel.author}</p>
                    <div className="prose prose-sm sm:prose-base max-w-none dark:prose-invert whitespace-pre-line text-foreground">
                         {novel.description || <span className="italic text-muted-foreground">No description provided.</span>}
                    </div>
                 </div>
              </div>

              {/* Chapters Section (Display Only) */}
              <div className="bg-card rounded-lg shadow p-6 border border-border/10">
                  <h2 className="text-xl font-semibold text-foreground mb-4">Chapters</h2>

                  {/* Chapter List */}
                  <div className="space-y-1">
                     {/* Show skeleton if chapters specifically haven't loaded yet, even if novel has */}
                     {chapters === null && !loadError ? (
                         <ChaptersSkeleton />
                     ) : displayedChapters.length > 0 ? (
                         displayedChapters.map((chapter) => (
                            <Link
                                key={chapter.id}
                                href={`/novels/${novelId}/chapter/${chapter.chapter_number}`}
                                className="flex items-center justify-between p-2 rounded-md hover:bg-accent group"
                            >
                                <span className="text-sm text-foreground truncate group-hover:text-primary group-hover:underline underline-offset-2">
                                    Chapter {chapter.chapter_number}: {chapter.title}
                                </span>
                                {chapter.is_locked && (
                                    <Lock size={14} className="text-muted-foreground flex-shrink-0 ml-2" />
                                )}
                            </Link>
                         ))
                     ) : !loadError ? ( // Only show "no chapters" if there wasn't a load error
                         <p className="text-sm text-muted-foreground italic p-2">No chapters available for this novel.</p>
                     ) : null /* Don't show "no chapters" if there was a general load error */ }
                  </div>
              </div>
            </div>
          ) : null }
        </div>
      </div>
    </div>
  );
}