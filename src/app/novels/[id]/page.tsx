// src/app/novels/[id]/page.tsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import { BookOpen, Edit, Trash2, Check, X, Plus, Lock, Unlock } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ImageUpload } from '@/components/ui/image-upload';
import { supabase } from '@/lib/supabase';
import { getNovel, getNovelChapters, deleteChapter, updateChapter, updateAllChaptersLockStatus } from '@/lib/api';
import type { Novel, ChapterType } from '@/types/supabase';
import Image from 'next/image';
import { useAuth } from '@/providers/auth-provider';
import AddChapterModal from '@/components/add-chapter-modal';
// import LoadingScreen from '@/components/ui/loading-screen'; // <-- REMOVED
import NotFoundScreen from '@/components/ui/not-found-screen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { cn } from '@/lib/utils';
import ChapterTitleEditor from '@/components/chapter-title-editor';

// Skeleton Loader for Chapters (Keep as is)
function ChaptersSkeleton() { //
    return ( //
        <div className="space-y-1 animate-pulse">
            {[...Array(5)].map((_, i) => ( //
                <div key={i} className="flex items-center justify-between p-2 rounded-md">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="h-5 bg-muted rounded w-3/4"></div>
                    </div>
                    <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                        <div className="h-7 w-7 bg-muted rounded-full"></div>
                        <div className="h-7 w-7 bg-muted rounded-full"></div>
                    </div>
                </div> //
            ))}
        </div> //
    ); //
} //

// --- Skeleton Components for Novel Details ---
function NovelDetailsSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-pulse">
             {/* Left Column Skeleton */}
             <div className="md:col-span-1 space-y-4">
                {/* Cover Skeleton */}
                <div className="relative aspect-[2/3] w-full bg-muted rounded-lg shadow-lg"></div>
                {/* Image Upload Skeleton (optional, can be hidden) */}
                 <div className="h-10 bg-muted rounded-md"></div>
                 {/* Stats Card Skeleton */}
                 <div className="space-y-3 bg-muted/50 p-4 rounded-lg shadow border border-border/10">
                     <div className="flex items-center justify-between">
                        <div className="h-4 bg-muted rounded w-1/4"></div>
                        <div className="h-4 bg-muted rounded w-1/6"></div>
                     </div>
                     <div className="flex items-center justify-between">
                         <div className="h-4 bg-muted rounded w-1/4"></div>
                         <div className="h-5 w-1/5 bg-muted rounded-full"></div>
                     </div>
                     <div className="pt-1 space-y-2">
                         <div className="h-4 bg-muted rounded w-1/5 mb-1"></div>
                         <div className="flex flex-wrap gap-1">
                             <div className="h-5 w-12 bg-muted rounded-full"></div>
                             <div className="h-5 w-16 bg-muted rounded-full"></div>
                             <div className="h-5 w-14 bg-muted rounded-full"></div>
                         </div>
                     </div>
                 </div>
             </div>
              {/* Right Column Skeleton */}
              <div className="md:col-span-2 space-y-6">
                  {/* Title/Desc Skeleton */}
                  <div className="bg-muted/50 rounded-lg shadow p-6 border border-border/10 space-y-3">
                      <div className="flex justify-between items-start">
                           <div className="h-8 bg-muted rounded w-3/4"></div>
                           <div className="h-8 w-8 bg-muted rounded-md"></div>
                      </div>
                      <div className="h-4 bg-muted rounded w-1/4"></div> {/* Author placeholder */}
                      <div className="space-y-2 pt-2"> {/* Description placeholder */}
                           <div className="h-4 bg-muted rounded w-full"></div>
                           <div className="h-4 bg-muted rounded w-full"></div>
                           <div className="h-4 bg-muted rounded w-5/6"></div>
                      </div>
                  </div>
                  {/* Chapters Section Skeleton (Header + ChaptersSkeleton) */}
                  <div className="bg-muted/50 rounded-lg shadow p-6 border border-border/10">
                       <div className="flex justify-between items-center mb-4">
                           <div className="h-6 bg-muted rounded w-1/3"></div>
                           <div className="flex gap-2">
                                <div className="h-8 w-24 bg-muted rounded-md"></div>
                                <div className="h-8 w-28 bg-muted rounded-md"></div>
                                <div className="h-8 w-28 bg-muted rounded-md"></div>
                           </div>
                       </div>
                       <ChaptersSkeleton /> {/* Use existing chapter skeleton */}
                  </div>
              </div>
        </div>
    );
}


export default function NovelPage() {
  // Ensure all state and functions are within the component scope
  const { user, role, loading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const novelIdParam = params.id;

  // State
  const [novelId, setNovelId] = useState<number | null>(null);
  const [novel, setNovel] = useState<Novel | null>(null); // Initialize as null
  const [chapters, setChapters] = useState<ChapterType[] | null>(null); // Initialize as null
  // const [loadingNovel, setLoadingNovel] = useState(true); // <-- REMOVED
  const [loadingChapters, setLoadingChapters] = useState(false); // Keep for chapters list
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isAuthor, setIsAuthor] = useState(false);
  const [isEditingNovel, setIsEditingNovel] = useState(false);
  const [isEditingChapterId, setIsEditingChapterId] = useState<number | null>(null);
  const [editedNovelTitle, setEditedNovelTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [showAddChapter, setShowAddChapter] = useState(false);
  const [savingNovel, setSavingNovel] = useState(false);
  const [chapterOperationStatus, setChapterOperationStatus] = useState<{
      id: number | null;
      type: 'savingTitle' | 'deleting' | 'togglingLock' | null;
  }>({ id: null, type: null });
  const [bulkLockLoading, setBulkLockLoading] = useState(false);

  // Validate novelIdParam
  useEffect(() => {
      const id = Number(novelIdParam);
      if (!isNaN(id) && id > 0) {
          setNovelId(id);
          setNovel(null); // Reset novel state when ID changes
          setChapters(null); // Reset chapters state
          setLoadError(null); // Reset error
      } else {
          setLoadError("Invalid Novel ID provided in URL.");
          // setLoadingNovel(false); // No longer needed
          setNovelId(null);
      }
  }, [novelIdParam]);

  // Fetch Novel Metadata (Combined Novel & Chapters Fetch)
  const loadNovelAndChapters = useCallback(async () => {
      if (novelId === null) {
          return; // Don't fetch if ID is invalid
      }
      console.log(`[NovelPage] Attempting to load novel (${novelId}) and chapters.`);
      // setLoadingNovel(true); // REMOVED
      setLoadingChapters(true); // Start loading chapters specifically
      setLoadError(null);
      // Keep novel/chapters null until fetch completes

      try {
          const [novelData, chaptersData] = await Promise.all([
               getNovel(novelId),
               getNovelChapters(novelId)
          ]);

          console.log("[NovelPage] Metadata received:", novelData);
          console.log("[NovelPage] Chapters received:", chaptersData);

          if (novelData) {
              setNovel(novelData); // Set novel data
              setChapters(chaptersData || []); // Set chapters data (or empty array)
          } else {
              console.log("[NovelPage] getNovel returned null, setting error.");
              setLoadError("Novel not found or failed to load.");
              setNovel(null); // Ensure novel is null on error
              setChapters(null); // Ensure chapters are null on error
          }
      } catch (err: any) {
          console.error("[NovelPage] Error during data fetch:", err);
          setLoadError(err.message || "An unexpected error occurred while loading data.");
          setNovel(null); // Ensure novel is null on error
          setChapters(null); // Ensure chapters are null on error
      } finally {
          console.log("[NovelPage] Data loading attempt finished.");
          // setLoadingNovel(false); // REMOVED
          setLoadingChapters(false); // Finish loading chapters state
      }
  }, [novelId]);

  // Trigger loadNovelAndChapters
  useEffect(() => {
      if (novelId !== null && !isEditingNovel) { // Don't refetch if editing
          loadNovelAndChapters();
      }
  }, [novelId, loadNovelAndChapters, isEditingNovel]);

  // Determine Author Status
  useEffect(() => {
    // Ensure role is checked only after auth is not loading
    if (!authLoading) {
         const isAdmin = role === 'admin';
         setIsAuthor(isAdmin);
         console.log(`[NovelPage] Author status determined: ${isAdmin} (Role: ${role})`);
    }
  }, [role, authLoading]); // Depend on authLoading too

  // --- Handlers --- (Keep all handlers as they were: handleStartEditNovel, handleCancelEditNovel, handleSaveNovelDetails, handleStartEditChapter, handleCancelEditChapter, handleSaveChapterTitle, handleDeleteChapter, handleToggleChapterLock, handleChapterAdded, handleBulkLockUnlock)
   const handleStartEditNovel = () => { //
    if (!novel) return; //
    setEditedNovelTitle(novel.title); //
    setEditedDescription(novel.description || ''); //
    setIsEditingNovel(true); //
  }; //

  const handleCancelEditNovel = () => { //
    setIsEditingNovel(false); //
  }; //
  const handleSaveNovelDetails = async () => { //
    if (!novel || !isAuthor || novelId === null) return; //
    setSavingNovel(true); //
    toast.info("Saving novel details..."); //
    try { //
      const { error } = await supabase //
        .from('novels') //
        .update({ //
          title: editedNovelTitle.trim(), //
          description: editedDescription.trim() //
        }) //
        .eq('id', novelId); //
      if (error) throw error; //
      // Update local state immediately
      setNovel(prev => prev ? { //
        ...prev, //
        title: editedNovelTitle.trim(), //
        description: editedDescription.trim() //
      } : null); //
      setIsEditingNovel(false); //
      toast.success("Novel details updated!"); //
    } catch (error: any) { //
      console.error('Error updating novel details:', error); //
      toast.error(`Failed to update novel: ${error.message}`); //
    } finally { //
      setSavingNovel(false); //
    } //
  }; //
  const handleStartEditChapter = (chapter: ChapterType) => { //
      if (chapterOperationStatus.id !== null) { //
          toast.info("Please wait for the current chapter operation to complete."); //
          return; //
      } //
      setIsEditingChapterId(chapter.id); //
  }; //

  const handleCancelEditChapter = () => { //
      setIsEditingChapterId(null); //
  }; //

  const handleSaveChapterTitle = async (chapterId: number, newTitle: string) => { //
     if (!novel || !isAuthor || novelId === null) return; //
     setChapterOperationStatus({ id: chapterId, type: 'savingTitle' }); //
     toast.info("Saving chapter title..."); //
     try { //
       const success = await updateChapter(novelId, chapterId, { title: newTitle }); //
       if (!success) throw new Error("API returned failure"); //
       setChapters(prevChapters => { //
           if (!prevChapters) return null; //
           return prevChapters.map(ch => //
               ch.id === chapterId ? { ...ch, title: newTitle } : ch //
           ); //
       }); //
       setIsEditingChapterId(null); //
       toast.success("Chapter title updated!"); //
     } catch (error: any) { //
       console.error('Error updating chapter title:', error); //
       toast.error(`Failed to update chapter title: ${error.message}`); //
     } finally { //
       setChapterOperationStatus({ id: null, type: null }); //
     } //
  }; //

  const handleDeleteChapter = async (chapterId: number, chapterNumber: number) => { //
    if (!novel || !isAuthor || novelId === null) return; //
    if (!confirm(`Are you sure you want to permanently delete Chapter ${chapterNumber}? This cannot be undone.`)) { //
      return; //
    } //
    setChapterOperationStatus({ id: chapterId, type: 'deleting' }); //
    toast.info(`Deleting Chapter ${chapterNumber}...`); //
    try { //
       const success = await deleteChapter(novelId, chapterId); //
       if (!success) throw new Error("API returned failure"); //
       // Refetch chapters after delete to ensure numbering is correct
       handleChapterAdded(); // Re-use the reload logic
       toast.success(`Chapter ${chapterNumber} deleted successfully.`); //
    } catch (error: any) { //
       console.error('Error deleting chapter:', error); //
       toast.error(`Failed to delete chapter: ${error.message}`); //
    } finally { //
       setChapterOperationStatus({ id: null, type: null }); //
    } //
  }; //

   const handleToggleChapterLock = async (chapterId: number, currentLockedStatus: boolean) => { //
      if (!novel || !isAuthor || novelId === null) return; //
      if (bulkLockLoading || chapterOperationStatus.id !== null) { //
          toast.info("Please wait for current operations to complete."); //
          return; //
      } //

      const newLockedStatus = !currentLockedStatus; //
      const action = newLockedStatus ? 'Locking' : 'Unlocking'; //
      setChapterOperationStatus({ id: chapterId, type: 'togglingLock' }); //
      toast.info(`${action} chapter...`); //

      try { //
          const success = await updateChapter(novelId, chapterId, { is_locked: newLockedStatus }); //
          if (!success) throw new Error("API returned failure"); //
          setChapters(prevChapters => { //
              if (!prevChapters) return null; //
              return prevChapters.map(ch => //
                  ch.id === chapterId ? { ...ch, is_locked: newLockedStatus } : ch //
              ); //
          }); //
          toast.success(`Chapter successfully ${newLockedStatus ? 'locked' : 'unlocked'}.`); //
      } catch (error: any) { //
          console.error(`Error toggling lock for chapter ${chapterId}:`, error); //
          toast.error(`Failed to ${action.toLowerCase()} chapter: ${error.message}`); //
      } finally { //
          setChapterOperationStatus({ id: null, type: null }); //
      } //
  }; //

  const handleChapterAdded = useCallback(() => { // Wrap in useCallback
      setShowAddChapter(false); //
      toast.success("Chapter list updated, reloading..."); //
      setLoadingChapters(true); //
      // Assert novelId is not null here as it's checked before rendering the button
      if (novelId === null) return; // Add safety check
      getNovelChapters(novelId).then(fetchedChapters => { //
          setChapters(fetchedChapters); //
      }).catch(err => { //
          console.error("[NovelPage] Error reloading chapters:", err); //
          toast.error("Failed to reload chapters."); //
          setChapters([]); //
      }).finally(() => { //
          setLoadingChapters(false); //
      }); //
  }, [novelId]); // Add novelId as dependency

  const handleBulkLockUnlock = async (lockStatus: boolean) => { //
      if (!novel || !isAuthor || novelId === null) return; //
      if (bulkLockLoading || chapterOperationStatus.id !== null) { //
          toast.info("Please wait for current operations to complete."); //
          return; //
      } //

      const action = lockStatus ? 'Locking' : 'Unlocking'; //
      const confirmMessage = lockStatus //
          ? `Are you sure you want to lock all chapters for "${novel.title}"?` //
          : `Are you sure you want to unlock all chapters for "${novel.title}"?`; //
      if (!confirm(confirmMessage)) { //
          return; //
      } //

      setBulkLockLoading(true); //
      toast.info(`${action} all chapters...`); //

      try { //
          const success = await updateAllChaptersLockStatus(novelId, lockStatus); //
          if (!success) throw new Error("API returned failure"); //
          setChapters((prevChapters: ChapterType[] | null) => { //
              if (!prevChapters) return null; //
              return prevChapters.map((ch: ChapterType) => ({ ...ch, is_locked: lockStatus })); //
          }); //
          toast.success(`All chapters successfully ${lockStatus ? 'locked' : 'unlocked'}.`); //
      } catch (error: any) { //
          console.error(`Error ${action.toLowerCase()} all chapters:`, error); //
          toast.error(`Failed to ${action.toLowerCase()} all chapters: ${error.message}`); //
      } finally { //
          setBulkLockLoading(false); //
      } //
  }; //

  // --- Render Logic ---

  // Handle invalid ID error first
  if (loadError?.includes("Invalid Novel ID")) {
      return <NotFoundScreen message={loadError} returnUrl="/" returnText="Return to Home" />;
  }

  // Handle other load errors after checking if novel data is ready
  if (loadError && !novel) {
    return <NotFoundScreen message={loadError} returnUrl="/" returnText="Return to Home"/>;
  }

  // Use a variable to track if any chapter operation is in progress
  const isAnyChapterOperationInProgress = chapterOperationStatus.id !== null || bulkLockLoading;

  // --- Main Render ---
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <div className="container mx-auto px-4 py-8">
        {/* Show skeleton if novel data is null and no error */}
        {!novel && !loadError ? (
            <NovelDetailsSkeleton />
        ) : novel ? (
           // Render actual content if novel data exists
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Left Column - Cover and Info */}
            <div className="md:col-span-1">
                <div className="relative aspect-[2/3] w-full mb-4 shadow-lg rounded-lg overflow-hidden border border-border/10">
                 {/* Use a placeholder background if cover_url is null */}
                 {!novel.cover_url ? (
                      <div className="absolute inset-0 bg-muted flex items-center justify-center">
                          <BookOpen className="h-16 w-16 text-muted-foreground/50" />
                      </div>
                  ) : (
                      <Image
                          src={novel.cover_url}
                          alt={`Cover for ${novel.title}`}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          quality={85}
                          priority // Prioritize loading cover image
                          className="object-cover"
                          placeholder="blur"
                          blurDataURL="/placeholder-cover-blur.png" // Keep placeholder
                          onError={(e) => { // Fallback for broken image URLs
                              console.warn(`Error loading image: ${novel.cover_url}`);
                              e.currentTarget.src = '/placeholder-cover.png'; // Needs a static placeholder
                              e.currentTarget.srcset = '';
                          }}
                      />
                  )}
                </div>
              {isAuthor && (
                <div className="mb-4">
                    <ImageUpload
                      onUploadComplete={async (url: string) => {
                        if (novelId === null) return; // Should not happen if novel exists
                        toast.info("Updating cover image...");
                        const { error } = await supabase
                            .from('novels')
                            .update({ cover_url: url })
                            .eq('id', novelId);
                        if (error) {
                            toast.error(`Error updating cover: ${error.message}`);
                            return;
                        }
                        // Update local state optimistically
                        setNovel(prev => prev ? { ...prev, cover_url: url } : null);
                        toast.success("Cover image updated!");
                     }}
                    />
                  </div>
              )}
              <div className="space-y-3 text-sm bg-card p-4 rounded-lg shadow border border-border/10">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-muted-foreground">Rating</span>
                    <span className="text-yellow-500 font-semibold">★ {novel.rating?.toFixed(1) ?? 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-muted-foreground">Status</span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      novel.status === 'Ongoing'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
                    }`}>
                      {novel.status}
                    </span>
                  </div>
                  <div className="pt-1">
                   <span className="font-medium text-muted-foreground mb-1 block">Tags</span>
                    <div className="flex flex-wrap gap-1 ">
                      {novel.tags?.map((tag) => (
                        <span key={tag} className="px-2 py-0.5 text-xs rounded-full bg-secondary text-secondary-foreground">
                          {tag}
                        </span>
                      ))}
                      {(!novel.tags || novel.tags.length === 0) && <span className="text-xs text-muted-foreground italic">No tags</span>}
                    </div>
                  </div>
                </div>
            </div>

            {/* Right Column - Description and Chapters */}
            <div className="md:col-span-2 space-y-6">
              {/* Title and Description Section */}
              <div className="bg-card rounded-lg shadow p-6 border border-border/10">
                {isEditingNovel ? (
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="edit-novel-title" className="block text-sm font-medium mb-1 text-muted-foreground">
                        Title
                      </label>
                      <Input
                        id="edit-novel-title"
                        type="text"
                        value={editedNovelTitle}
                        onChange={(e) => setEditedNovelTitle(e.target.value)}
                        className="w-full"
                        disabled={savingNovel}
                      />
                    </div>
                    <div>
                      <label htmlFor="edit-novel-desc" className="block text-sm font-medium mb-1 text-muted-foreground">
                        Description
                      </label>
                      <Textarea
                        id="edit-novel-desc"
                        value={editedDescription}
                        onChange={(e) => setEditedDescription(e.target.value)}
                        rows={5}
                        className="w-full"
                        disabled={savingNovel}
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        variant="ghost"
                        onClick={handleCancelEditNovel}
                        disabled={savingNovel}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSaveNovelDetails}
                        disabled={savingNovel || !editedNovelTitle.trim()}
                      >
                        {savingNovel ? <LoadingSpinner className="mr-2" size="sm"/> : null}
                        {savingNovel ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h1 className="text-2xl md:text-3xl font-bold text-foreground">{novel.title}</h1>
                      {isAuthor && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleStartEditNovel}
                          className="text-muted-foreground hover:text-foreground"
                          aria-label="Edit novel title and description"
                           // Disable if any operation is in progress
                          disabled={isAnyChapterOperationInProgress || savingNovel}
                        >
                          <Edit size={18} />
                        </Button>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">by {novel.author}</p>
                    <div className="prose prose-sm sm:prose-base max-w-none dark:prose-invert whitespace-pre-line text-foreground">
                       {novel.description || <span className="italic text-muted-foreground">No description provided.</span>}
                    </div>
                  </div>
                )}
              </div>

              {/* Chapters Section */}
              <div className="bg-card rounded-lg shadow p-6 border border-border/10">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-foreground">Chapters</h2>
                  {isAuthor && (
                     <div className="flex items-center gap-2 flex-wrap"> {/* Allow wrap */}
                        {!loadingChapters && chapters && chapters.length > 0 && (
                             <>
                                 <Button
                                     onClick={() => handleBulkLockUnlock(true)}
                                     size="sm"
                                     variant="outline"
                                     className="gap-1 text-destructive border-destructive hover:bg-destructive/10"
                                      // Disable if any operation is in progress
                                     disabled={isAnyChapterOperationInProgress || savingNovel}
                                 >
                                     {bulkLockLoading ? <LoadingSpinner className="mr-1" size="sm"/> : <Lock size={16} className="mr-1" />}
                                     Lock All
                                 </Button>
                                <Button
                                     onClick={() => handleBulkLockUnlock(false)}
                                     size="sm"
                                     variant="outline"
                                     className="gap-1 text-green-600 border-green-600 hover:bg-green-500/10"
                                      // Disable if any operation is in progress
                                     disabled={isAnyChapterOperationInProgress || savingNovel}
                                 >
                                     {bulkLockLoading ? <LoadingSpinner className="mr-1" size="sm"/> : <Unlock size={16} className="mr-1" />}
                                     Unlock All
                                 </Button>
                            </>
                         )}
                         <Button
                           onClick={() => setShowAddChapter(true)}
                           size="sm"
                           variant="outline"
                            // Disable if any operation is in progress
                           disabled={loadingChapters || isAnyChapterOperationInProgress || savingNovel}
                         >
                           <Plus size={16} className="mr-1" />
                           Add Chapter
                         </Button>
                     </div>
                  )}
                </div>

                {showAddChapter && chapters !== null && novelId !== null && (
                  <AddChapterModal
                     novelId={novelId}
                    currentChapters={chapters ?? []} // Pass empty array if null
                    onClose={() => setShowAddChapter(false)}
                    onSuccess={handleChapterAdded}
                  />
                )}

                <div className="space-y-1">
                  {loadingChapters ? (
                      <ChaptersSkeleton />
                  ) : chapters && chapters.length > 0 ? (
                    [...chapters] // Ensure sorting happens on a copy
                      .sort((a, b) => a.chapter_number - b.chapter_number)
                      .map((chapter) => (
                         <ChapterTitleEditor
                             key={chapter.id}
                             chapter={chapter}
                             novelId={novelId!} // Safe to assert non-null as novel exists
                             isAuthor={isAuthor}
                             isEditing={isEditingChapterId === chapter.id}
                             onStartEdit={handleStartEditChapter}
                             onCancelEdit={handleCancelEditChapter}
                             onSaveTitle={handleSaveChapterTitle}
                             onToggleLock={handleToggleChapterLock}
                             onDeleteChapter={handleDeleteChapter}
                             savingTitle={chapterOperationStatus.id === chapter.id && chapterOperationStatus.type === 'savingTitle'}
                             deletingChapter={chapterOperationStatus.id === chapter.id && chapterOperationStatus.type === 'deleting'}
                             togglingLock={chapterOperationStatus.id === chapter.id && chapterOperationStatus.type === 'togglingLock'}
                             bulkOperationInProgress={bulkLockLoading}
                             // Disable individual edits during novel save
                             disabled={savingNovel}
                        />
                    ))
                  ) : chapters !== null ? ( // Check chapters is not null before showing empty message
                    <p className="text-sm text-muted-foreground italic p-2">No chapters added yet.</p>
                  ) : null /* Render nothing if chapters is still null (should be brief) */}
                </div>
              </div>
            </div>
          </div>
        ) : null /* Don't render anything if novel is null AND there's no error */ }
      </div>
    </div>
  );
}