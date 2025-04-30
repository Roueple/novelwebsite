// src/app/novels/[id]/page.tsx (Corrected View-Only Version)
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { BookOpen, Edit, Trash2, Check, X, Plus, Lock, Unlock } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getNovel, getNovelChapters, deleteChapter, updateChapter, updateAllChaptersLockStatus } from '@/lib/api';
import type { Novel, ChapterType } from '@/types/supabase';
import Image from 'next/image';
import { useAuth } from '@/providers/auth-provider';
import AddChapterModal from '@/components/add-chapter-modal';
import NotFoundScreen from '@/components/ui/not-found-screen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // Keep Input for potential chapter search later
import { toast } from 'sonner';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { cn } from '@/lib/utils';
import ChapterTitleEditor from '@/components/chapter-title-editor';

// Skeleton Components (with return statements fixed)
function ChaptersSkeleton() {
    return (
        <div className="space-y-1 animate-pulse"> { [...Array(5)].map((_, i) => ( <div key={i} className="flex items-center justify-between p-2 rounded-md"> <div className="flex items-center gap-3 flex-1 min-w-0"> <div className="h-5 bg-muted rounded w-3/4"></div> </div> <div className="flex items-center gap-1 ml-2 flex-shrink-0"> <div className="h-7 w-7 bg-muted rounded-full"></div> <div className="h-7 w-7 bg-muted rounded-full"></div> </div> </div> ))} </div>
    );
}
function LeftColumnSkeleton() {
    return (
        <div className="md:col-span-1 space-y-4 animate-pulse"> <div className="relative aspect-[2/3] w-full bg-muted rounded-lg shadow-lg"></div> <div className="space-y-3 bg-card p-4 rounded-lg shadow border border-border/10"> <div className="flex items-center justify-between"> <div className="h-4 bg-muted rounded w-1/4"></div> <div className="h-4 bg-muted rounded w-1/6"></div> </div> <div className="flex items-center justify-between"> <div className="h-4 bg-muted rounded w-1/4"></div> <div className="h-5 w-1/5 bg-muted rounded-full"></div> </div> <div className="pt-1 space-y-2"> <div className="h-4 bg-muted rounded w-1/5 mb-1"></div> <div className="flex flex-wrap gap-1"> <div className="h-5 w-12 bg-muted rounded-full"></div> <div className="h-5 w-16 bg-muted rounded-full"></div> <div className="h-5 w-14 bg-muted rounded-full"></div> </div> </div> </div> </div>
    );
}
function RightColumnSkeleton() {
    return (
        <div className="md:col-span-2 space-y-6 animate-pulse"> <div className="bg-card rounded-lg shadow p-6 border border-border/10 space-y-3"> <div className="flex justify-between items-start"> <div className="h-8 bg-muted rounded w-3/4"></div> <div className="h-8 w-8 bg-muted rounded-md"></div> </div> <div className="h-4 bg-muted rounded w-1/4"></div> <div className="space-y-2 pt-2"> <div className="h-4 bg-muted rounded w-full"></div> <div className="h-4 bg-muted rounded w-full"></div> <div className="h-4 bg-muted rounded w-5/6"></div> </div> </div> <div className="bg-card rounded-lg shadow p-6 border border-border/10"> <div className="flex justify-between items-center mb-4"> <div className="h-6 bg-muted rounded w-1/3"></div> <div className="flex gap-2"> <div className="h-8 w-24 bg-muted rounded-md"></div> <div className="h-8 w-28 bg-muted rounded-md"></div> <div className="h-8 w-28 bg-muted rounded-md"></div> </div> </div> <ChaptersSkeleton /> </div> </div>
    );
}

export default function NovelPage() {
  // Hooks and State
  const { user, role, loading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const novelIdParam = params.id;
  const [novelId, setNovelId] = useState<number | null>(null);
  const [novel, setNovel] = useState<Novel | null>(null);
  const [chapters, setChapters] = useState<ChapterType[] | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isAuthor, setIsAuthor] = useState(false);
  const [isEditingChapterId, setIsEditingChapterId] = useState<number | null>(null);
  const [showAddChapter, setShowAddChapter] = useState(false);
  const [chapterOperationStatus, setChapterOperationStatus] = useState<{ id: number | null; type: string | null; }>({ id: null, type: null });
  const [bulkLockLoading, setBulkLockLoading] = useState(false);

  // Effects (Including refresh debugging logs)
  useEffect(() => {
    const id = Number(novelIdParam);
    if (!isNaN(id) && id > 0) { if (id !== novelId) { setNovelId(id); setNovel(null); setChapters(null); setLoadError(null); setDataLoading(true); setIsAuthor(false); } }
    else { setLoadError("Invalid Novel ID provided in URL."); setDataLoading(false); setNovelId(null); }
  }, [novelIdParam, novelId]);

  const loadNovelAndChapters = useCallback(async () => {
    if (novelId === null || authLoading) return;
    console.log(`[NovelPage Refresh Debug] loadNovelAndChapters called. novelId: ${novelId}, authLoading: ${authLoading}`);
    setDataLoading(true); setLoadError(null);
    try {
        const [novelData, chaptersData] = await Promise.all([getNovel(novelId), getNovelChapters(novelId)]);
        console.log("[NovelPage Refresh Debug] Fetched data:", { novelData: !!novelData, chaptersCount: chaptersData?.length });
        if (novelData) { setNovel(novelData); setChapters(chaptersData || []); }
        else { setLoadError("Novel not found or failed to load."); setNovel(null); setChapters(null); }
    } catch (err: any) {
        console.error("[NovelPage] Error during data fetch:", err);
        setLoadError(err.message || "An unexpected error occurred while loading data."); setNovel(null); setChapters(null);
    } finally { setDataLoading(false); console.log("[NovelPage Refresh Debug] Data loading finished."); }
  }, [novelId, authLoading]);

  useEffect(() => {
    console.log(`[NovelPage Refresh Debug] useEffect trigger. novelId: ${novelId}, authLoading: ${authLoading}, dataLoading: ${dataLoading}, novelLoaded: ${!!novel}, loadError: ${loadError}`);
    if (novelId !== null && !authLoading) { if (!novel && !loadError) { console.log("[NovelPage Refresh Debug] Conditions met, calling loadNovelAndChapters."); loadNovelAndChapters(); } else if(dataLoading) { console.log("[NovelPage Refresh Debug] Data is already loading, skipping fetch call."); } else { console.log("[NovelPage Refresh Debug] Conditions NOT met for fetch (already loaded/error/etc)."); } }
    else if (authLoading || novelId === null) { if (!dataLoading) { console.log("[NovelPage Refresh Debug] Setting dataLoading to true (auth pending or no ID)."); setDataLoading(true); } }
  }, [novelId, authLoading, loadNovelAndChapters, novel, loadError, dataLoading]);

  useEffect(() => {
    if (!authLoading) { const isAdmin = user !== null && role === 'admin'; if (isAdmin !== isAuthor) setIsAuthor(isAdmin); console.log(`[NovelPage Refresh Debug] Author status checked: ${isAdmin} (Role: ${role}, AuthLoading: ${authLoading})`); }
    else { if (isAuthor) setIsAuthor(false); }
  }, [role, authLoading, user, isAuthor]);

  // --- Chapter Handlers ---
  const handleStartEditChapter = (chapter: ChapterType) => setIsEditingChapterId(chapter.id);
  const handleCancelEditChapter = () => setIsEditingChapterId(null);

  const handleSaveChapterTitle = async (chapterId: number, newTitle: string): Promise<void> => { // Added Promise<void>
    setChapterOperationStatus({ id: chapterId, type: 'savingTitle' });
    try {
        const success = await updateChapter(novelId!, chapterId, { title: newTitle });
        if(success) { toast.success("Chapter title saved."); setChapters(prev => prev ? prev.map(c => c.id === chapterId ? { ...c, title: newTitle } : c) : null); handleCancelEditChapter(); }
        else toast.error("Failed to save title.");
    } catch (e) { toast.error("Error saving title."); }
    finally { setChapterOperationStatus({ id: null, type: null }); }
  };

  // --- FIX: Added explicit : Promise<void> return type ---
  const handleDeleteChapter = async (chapterId: number, chapterNumber: number): Promise<void> => {
     if (!confirm(`Delete Chapter ${chapterNumber}?`)) return;
     setChapterOperationStatus({ id: chapterId, type: 'deleting' });
     try {
         const success = await deleteChapter(novelId!, chapterId);
         if(success) { toast.success("Chapter deleted."); loadNovelAndChapters(); } // Refetch list
         else toast.error("Failed to delete chapter.");
     } catch (e) { toast.error("Error deleting chapter."); }
     finally { setChapterOperationStatus({ id: null, type: null }); }
  };
  // --- END FIX ---

  const handleToggleChapterLock = async (chapterId: number, currentLockedStatus: boolean): Promise<void> => { // Added Promise<void>
     setChapterOperationStatus({ id: chapterId, type: 'togglingLock' });
     try {
         const success = await updateChapter(novelId!, chapterId, { is_locked: !currentLockedStatus });
         if(success) { toast.success(`Chapter ${!currentLockedStatus ? 'locked' : 'unlocked'}.`); setChapters(prev => prev ? prev.map(c => c.id === chapterId ? { ...c, is_locked: !currentLockedStatus } : c) : null); }
         else toast.error("Failed to toggle lock status.");
     } catch (e) { toast.error("Error toggling lock."); }
     finally { setChapterOperationStatus({ id: null, type: null }); }
  };

  const handleChapterAdded = useCallback(() => { loadNovelAndChapters(); }, [loadNovelAndChapters]);

  const handleBulkLockUnlock = async (lockStatus: boolean): Promise<void> => { // Added Promise<void>
     setBulkLockLoading(true);
     try {
         const success = await updateAllChaptersLockStatus(novelId!, lockStatus);
         if (success) { toast.success(`All chapters ${lockStatus ? 'locked' : 'unlocked'}.`); loadNovelAndChapters(); }
         else toast.error(`Failed to ${lockStatus ? 'lock' : 'unlock'} all chapters.`);
     } catch (e) { toast.error("Error performing bulk action."); }
     finally { setBulkLockLoading(false); }
  };

  // Sorted Chapters
  const displayedChapters = useMemo(() => {
    if (!chapters) return [];
    return [...chapters].sort((a, b) => a.chapter_number - b.chapter_number);
  }, [chapters]);

  // Render Logic
  if (loadError?.includes("Invalid Novel ID")) return <NotFoundScreen message={loadError} returnUrl="/" returnText="Return to Home" />;
  if (!dataLoading && loadError && !novel) return <NotFoundScreen message={`Error: ${loadError}`} returnUrl="/" returnText="Return to Home"/>;

  const isAnyChapterOperationInProgress = chapterOperationStatus.id !== null || bulkLockLoading;
  const showSkeletons = (dataLoading || authLoading) && !novel; // Show skeleton only if data/auth loading AND novel isn't loaded yet

  // --- Main Render ---
  // --- FIX: Corrected JSX Structure (mainly ensuring closing tags match openings) ---
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
                               {/* Link to the new edit page */}
                               <Link href={`/novels/${novelId}/edit`}> <Edit size={18} /> </Link>
                            </Button>
                         )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">by {novel.author}</p>
                    <div className="prose prose-sm sm:prose-base max-w-none dark:prose-invert whitespace-pre-line text-foreground">
                         {novel.description || <span className="italic text-muted-foreground">No description provided.</span>}
                    </div>
                 </div>
              </div> {/* End Title/Desc Card */}

              {/* Chapters Section */}
              <div className="bg-card rounded-lg shadow p-6 border border-border/10">
                  <h2 className="text-xl font-semibold text-foreground mb-4">Chapters</h2>
                   {/* Chapter Sort/Filter controls can be added here later */}
                   {/* Admin Chapter Actions */}
                   {isAuthor && (
                       <div className="flex items-center gap-2 flex-wrap mb-4 border-b border-border pb-4">
                         {chapters && chapters.length > 0 && (
                           <>
                             <Button onClick={() => handleBulkLockUnlock(true)} size="sm" variant="outline" className="gap-1 text-destructive border-destructive hover:bg-destructive/10" disabled={isAnyChapterOperationInProgress}> {bulkLockLoading ? <LoadingSpinner className="mr-1" size="sm"/> : <Lock size={16} className="mr-1" />} Lock All </Button>
                             <Button onClick={() => handleBulkLockUnlock(false)} size="sm" variant="outline" className="gap-1 text-green-600 border-green-600 hover:bg-green-500/10" disabled={isAnyChapterOperationInProgress}> {bulkLockLoading ? <LoadingSpinner className="mr-1" size="sm"/> : <Unlock size={16} className="mr-1" />} Unlock All </Button>
                           </>
                         )}
                         <Button onClick={() => setShowAddChapter(true)} size="sm" variant="outline" disabled={isAnyChapterOperationInProgress}> <Plus size={16} className="mr-1" /> Add Chapter </Button>
                       </div>
                     )}

                  {/* Add Chapter Modal */}
                  {showAddChapter && chapters !== null && novelId !== null && (
                      <AddChapterModal novelId={novelId} currentChapters={chapters ?? []} onClose={() => setShowAddChapter(false)} onSuccess={handleChapterAdded} />
                  )}

                  {/* Chapter List */}
                  <div className="space-y-1">
                     {chapters === null && dataLoading ? ( // Check dataLoading specifically for chapter skeleton
                         <ChaptersSkeleton />
                     ) : displayedChapters.length > 0 ? (
                         displayedChapters.map((chapter) => (
                            <ChapterTitleEditor
                                key={chapter.id} chapter={chapter} novelId={novelId!} isAuthor={isAuthor}
                                isEditing={isEditingChapterId === chapter.id}
                                onStartEdit={handleStartEditChapter} onCancelEdit={handleCancelEditChapter}
                                onSaveTitle={handleSaveChapterTitle} onToggleLock={handleToggleChapterLock}
                                onDeleteChapter={handleDeleteChapter} // Prop name matches definition
                                savingTitle={chapterOperationStatus.id === chapter.id && chapterOperationStatus.type === 'savingTitle'}
                                deletingChapter={chapterOperationStatus.id === chapter.id && chapterOperationStatus.type === 'deleting'}
                                togglingLock={chapterOperationStatus.id === chapter.id && chapterOperationStatus.type === 'togglingLock'}
                                bulkOperationInProgress={bulkLockLoading}
                            />
                         ))
                     ) : (
                         <p className="text-sm text-muted-foreground italic p-2">No chapters added yet.</p>
                     )}
                  </div>
              </div> {/* End Chapters Card */}
            </div> /* End Right Column */
          ) : null }
        </div> {/* End Grid */}
      </div> {/* End Container */}
    </div> /* End Main Div */
  ); // End Return
} // End Component