// src/app/novels/[id]/page.tsx (Pure View, No Edit Btn, useEffect Fix v3)
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { BookOpen, Lock } from 'lucide-react'; // Removed Edit icon
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getNovel, getNovelChapters } from '@/lib/api';
import type { Novel, ChapterType } from '@/types/supabase';
import Image from 'next/image';
import NotFoundScreen from '@/components/ui/not-found-screen';
// Removed Button import as it's no longer used here
import LoadingSpinner from '@/components/ui/loading-spinner';
import { cn } from '@/lib/utils';

// --- Skeleton Components (Ensure they have return statements) ---
function ChaptersSkeleton() {
    return ( <div className="space-y-1 animate-pulse"> { [...Array(8)].map((_, i) => ( <div key={i} className="flex items-center justify-between p-2 rounded-md h-8 bg-muted/50"></div> ))} </div> );
}
function LeftColumnSkeleton() {
    return ( <div className="md:col-span-1 space-y-4 animate-pulse"> <div className="relative aspect-[2/3] w-full bg-muted rounded-lg shadow-lg"></div> <div className="space-y-3 bg-card p-4 rounded-lg shadow border border-border/10"> <div className="flex items-center justify-between"> <div className="h-4 bg-muted rounded w-1/4"></div> <div className="h-4 bg-muted rounded w-1/6"></div> </div> <div className="flex items-center justify-between"> <div className="h-4 bg-muted rounded w-1/4"></div> <div className="h-5 w-1/5 bg-muted rounded-full"></div> </div> <div className="pt-1 space-y-2"> <div className="h-4 bg-muted rounded w-1/5 mb-1"></div> <div className="flex flex-wrap gap-1"> <div className="h-5 w-12 bg-muted rounded-full"></div> <div className="h-5 w-16 bg-muted rounded-full"></div> <div className="h-5 w-14 bg-muted rounded-full"></div> </div> </div> </div> </div> );
}
function RightColumnSkeleton() {
    return ( <div className="md:col-span-2 space-y-6 animate-pulse"> <div className="bg-card rounded-lg shadow p-6 border border-border/10 space-y-3"> <div className="flex justify-between items-start"> <div className="h-8 bg-muted rounded w-3/4"></div> {/* Removed Edit button skeleton */} </div> <div className="h-4 bg-muted rounded w-1/4"></div> <div className="space-y-2 pt-2"> <div className="h-4 bg-muted rounded w-full"></div> <div className="h-4 bg-muted rounded w-full"></div> <div className="h-4 bg-muted rounded w-5/6"></div> </div> </div> <div className="bg-card rounded-lg shadow p-6 border border-border/10"> <div className="h-6 bg-muted rounded w-1/3 mb-4"></div> <ChaptersSkeleton /> </div> </div> );
}
// --- END Skeletons ---

export default function NovelPageView() {
  // Hooks and State
  const params = useParams();
  const novelIdParam = params.id;
  const [novelId, setNovelId] = useState<number | null>(null);
  const [novel, setNovel] = useState<Novel | null>(null);
  const [chapters, setChapters] = useState<ChapterType[] | null>(null);
  const [dataLoading, setDataLoading] = useState(true); // Start true
  const [loadError, setLoadError] = useState<string | null>(null);

  // Effect to parse novelId from URL parameter
  useEffect(() => {
    console.log(`[NovelPageView Debug] Parsing novelIdParam: ${novelIdParam}`);
    const id = Number(novelIdParam);
    if (!isNaN(id) && id > 0) {
        // Only update state if the ID is different from the current one
        if (id !== novelId) {
            console.log(`[NovelPageView Debug] Setting valid novelId: ${id}`);
            setNovelId(id);
            // Reset other states when ID changes, set loading
            setNovel(null);
            setChapters(null);
            setLoadError(null);
            setDataLoading(true);
        }
    } else {
        // Only set error if we aren't already showing an error or if novelId wasn't null
        if (novelId !== null || !loadError) {
            console.error(`[NovelPageView Debug] Invalid Novel ID in URL Param: ${novelIdParam}`);
            setLoadError("Invalid Novel ID provided in URL.");
            setDataLoading(false); // Stop loading if ID is invalid
            setNovelId(null);
            setNovel(null);
            setChapters(null);
        }
    }
  }, [novelIdParam, novelId, loadError]); // Depend on param, current ID, and error state

  // Data fetching function
  const loadNovelAndChapters = useCallback(async () => {
    // Extra guard against null ID, though the trigger effect should prevent this
    if (novelId === null) {
        console.warn("[NovelPageView Debug] loadNovelAndChapters called unexpectedly with null novelId.");
        return;
    }
    console.log(`[NovelPageView Debug] loadNovelAndChapters EXECUTION START. novelId: ${novelId}`);
    setDataLoading(true); // Ensure loading is true when fetch starts
    setLoadError(null);
    try {
        const [novelData, chaptersData] = await Promise.all([
            getNovel(novelId),
            getNovelChapters(novelId)
        ]);
        console.log("[NovelPageView Debug] API Fetch completed.");
        if (novelData) {
            setNovel(novelData);
            setChapters(chaptersData || []);
        } else {
            setLoadError("Novel not found or failed to load.");
            setNovel(null);
            setChapters(null);
        }
    } catch (err: any) {
        console.error("[NovelPageView] Error during data fetch:", err);
        setLoadError(err.message || "An unexpected error occurred.");
        setNovel(null);
        setChapters(null);
    } finally {
        setDataLoading(false); // Set loading false AFTER fetch attempt completes
        console.log("[NovelPageView Debug] loadNovelAndChapters EXECUTION END.");
    }
  }, [novelId]); // Depends only on novelId (and itself via useCallback)

  // Effect to trigger data fetch *only* when novelId is set/changed to a valid ID
  useEffect(() => {
    console.log(`[NovelPageView Debug] useEffect [novelId] trigger. novelId: ${novelId}`);
    // If we have a valid novelId, trigger the fetch.
    // loadNovelAndChapters handles the dataLoading state internally.
    if (novelId !== null) {
        console.log(`[NovelPageView Debug] Valid novelId (${novelId}) detected, calling loadNovelAndChapters.`);
        loadNovelAndChapters();
    } else {
         // Optional: Log if the ID becomes null after being valid, but don't reset state here
         // Resetting state here might interfere if the component is unmounting/remounting
         console.log(`[NovelPageView Debug] novelId is null in trigger effect.`);
    }
    // Depend ONLY on novelId and the stable load function reference
  }, [novelId, loadNovelAndChapters]);
  
  // Sorted Chapters
  const displayedChapters = useMemo(() => {
    if (!chapters) return [];
    return [...chapters].sort((a, b) => a.chapter_number - b.chapter_number);
  }, [chapters]);

  // Render Logic
  if (loadError) {
      // Show error screen if any loadError occurred
      return <NotFoundScreen message={loadError} returnUrl="/" returnText="Return to Home"/>;
  }

  // Show skeleton only if loading AND novel data hasn't arrived yet
  const showSkeletons = dataLoading && !novel;

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
                         {/* Edit button is now completely removed */}
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
                  <div className="space-y-1">
                     {/* Use dataLoading for chapter skeleton only if novel is loaded but chapters aren't */}
                     {dataLoading && chapters === null ? (
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
                     // Only show "no chapters" if not loading and chapter array is empty
                     ) : !dataLoading && chapters?.length === 0 ? (
                         <p className="text-sm text-muted-foreground italic p-2">No chapters available for this novel.</p>
                     ) : null /* Covers loading chapters case implicitly */}
                  </div>
              </div>
            </div>
          ) : null }
        </div>
      </div>
    </div>
  );
}