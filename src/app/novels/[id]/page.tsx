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
import LoadingScreen from '@/components/ui/loading-screen';
import NotFoundScreen from '@/components/ui/not-found-screen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { cn } from '@/lib/utils';
import ChapterTitleEditor from '@/components/chapter-title-editor';

// Skeleton Loader for Chapters
function ChaptersSkeleton() {
    return (
        <div className="space-y-1 animate-pulse">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-md">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                         <div className="h-5 bg-muted rounded w-3/4"></div>
                    </div>
                    <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                        <div className="h-7 w-7 bg-muted rounded-full"></div>
                        <div className="h-7 w-7 bg-muted rounded-full"></div>
                    </div>
                </div>
            ))}
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
  const [novel, setNovel] = useState<Novel | null>(null);
  const [chapters, setChapters] = useState<ChapterType[] | null>(null);
  const [loadingNovel, setLoadingNovel] = useState(true);
  const [loadingChapters, setLoadingChapters] = useState(false);
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
      } else {
          setLoadError("Invalid Novel ID provided in URL.");
          setLoadingNovel(false);
          setNovelId(null);
      }
  }, [novelIdParam]);

  // Fetch Novel Metadata
  const loadNovelMetadata = useCallback(async () => {
      if (novelId === null) {
          setLoadingNovel(false);
          return;
      }
      console.log(`[NovelPage] Attempting to load novel metadata ID: ${novelId}`);
      setLoadingNovel(true);
      setLoadError(null);
      setChapters(null);
      setLoadingChapters(false);

      try {
          const data = await getNovel(novelId);
          console.log("[NovelPage] Metadata received:", data);
          if (data) {
              setNovel(data);
              setLoadingChapters(true);
              getNovelChapters(novelId).then(fetchedChapters => {
                  console.log("[NovelPage] Chapters received:", fetchedChapters);
                  setChapters(fetchedChapters);
              }).catch(err => {
                  console.error("[NovelPage] Error loading chapters:", err);
                  toast.error("Failed to load chapters.");
                  setChapters([]);
              }).finally(() => {
                  setLoadingChapters(false);
              });
          } else {
              console.log("[NovelPage] getNovel returned null, setting error.");
              setLoadError("Novel not found or failed to load.");
              setLoadingChapters(false);
          }
      } catch (err: any) {
          console.error("[NovelPage] Error during getNovel call:", err);
          setLoadError(err.message || "An unexpected error occurred while loading the novel.");
          setLoadingChapters(false);
      } finally {
          console.log("[NovelPage] Novel metadata loading finished.");
          setLoadingNovel(false);
      }
  }, [novelId]);

  // Trigger loadNovelMetadata
  useEffect(() => {
      if (novelId !== null) {
          loadNovelMetadata();
      }
  }, [novelId, loadNovelMetadata]);

  // Determine Author Status
  useEffect(() => {
    const isAdmin = role === 'admin';
    setIsAuthor(isAdmin);
    console.log(`[NovelPage] Author status determined: ${isAdmin} (Role: ${role})`);
  }, [role]);

  // --- Handlers ---
  // (Make sure all handlers below are defined within the NovelPage component scope)

  const handleStartEditNovel = () => {
    if (!novel) return;
    setEditedNovelTitle(novel.title);
    setEditedDescription(novel.description || '');
    setIsEditingNovel(true);
  };

  const handleCancelEditNovel = () => {
    setIsEditingNovel(false);
  };

  const handleSaveNovelDetails = async () => {
    if (!novel || !isAuthor || novelId === null) return;
    setSavingNovel(true);
    toast.info("Saving novel details...");
    try {
      const { error } = await supabase
        .from('novels')
        .update({
          title: editedNovelTitle.trim(),
          description: editedDescription.trim()
        })
        .eq('id', novelId);
      if (error) throw error;
      setNovel(prev => prev ? {
        ...prev,
        title: editedNovelTitle.trim(),
        description: editedDescription.trim()
      } : null);
      setIsEditingNovel(false);
      toast.success("Novel details updated!");
    } catch (error: any) {
      console.error('Error updating novel details:', error);
      toast.error(`Failed to update novel: ${error.message}`);
    } finally {
      setSavingNovel(false);
    }
  };

  const handleStartEditChapter = (chapter: ChapterType) => {
      if (chapterOperationStatus.id !== null) {
          toast.info("Please wait for the current chapter operation to complete.");
          return;
      }
      setIsEditingChapterId(chapter.id);
  };

  const handleCancelEditChapter = () => {
      setIsEditingChapterId(null);
  };

  const handleSaveChapterTitle = async (chapterId: number, newTitle: string) => {
     if (!novel || !isAuthor || novelId === null) return;
     setChapterOperationStatus({ id: chapterId, type: 'savingTitle' });
     toast.info("Saving chapter title...");
     try {
       const success = await updateChapter(novelId, chapterId, { title: newTitle });
       if (!success) throw new Error("API returned failure");
       setChapters(prevChapters => {
           if (!prevChapters) return null;
           return prevChapters.map(ch =>
               ch.id === chapterId ? { ...ch, title: newTitle } : ch
           );
       });
       setIsEditingChapterId(null);
       toast.success("Chapter title updated!");
     } catch (error: any) {
       console.error('Error updating chapter title:', error);
       toast.error(`Failed to update chapter title: ${error.message}`);
     } finally {
       setChapterOperationStatus({ id: null, type: null });
     }
  };

  const handleDeleteChapter = async (chapterId: number, chapterNumber: number) => {
    if (!novel || !isAuthor || novelId === null) return;
    if (!confirm(`Are you sure you want to permanently delete Chapter ${chapterNumber}? This cannot be undone.`)) {
      return;
    }
    setChapterOperationStatus({ id: chapterId, type: 'deleting' });
    toast.info(`Deleting Chapter ${chapterNumber}...`);
    try {
       const success = await deleteChapter(novelId, chapterId);
       if (!success) throw new Error("API returned failure");
       setChapters(prevChapters => {
           if (!prevChapters) return null;
           let chapterCounter = 1;
           return prevChapters
               .filter(ch => ch.id !== chapterId)
               .sort((a, b) => a.chapter_number - b.chapter_number)
               .map(ch => ({ ...ch, chapter_number: chapterCounter++ }));
       });
       toast.success(`Chapter ${chapterNumber} deleted successfully.`);
    } catch (error: any) {
       console.error('Error deleting chapter:', error);
       toast.error(`Failed to delete chapter: ${error.message}`);
    } finally {
       setChapterOperationStatus({ id: null, type: null });
    }
  };

   const handleToggleChapterLock = async (chapterId: number, currentLockedStatus: boolean) => {
      if (!novel || !isAuthor || novelId === null) return;
      if (bulkLockLoading || chapterOperationStatus.id !== null) {
          toast.info("Please wait for current operations to complete.");
          return;
      }

      const newLockedStatus = !currentLockedStatus;
      const action = newLockedStatus ? 'Locking' : 'Unlocking';
      setChapterOperationStatus({ id: chapterId, type: 'togglingLock' });
      toast.info(`${action} chapter...`);

      try {
          const success = await updateChapter(novelId, chapterId, { is_locked: newLockedStatus });
          if (!success) throw new Error("API returned failure");
          setChapters(prevChapters => {
              if (!prevChapters) return null;
              return prevChapters.map(ch =>
                  ch.id === chapterId ? { ...ch, is_locked: newLockedStatus } : ch
              );
          });
          toast.success(`Chapter successfully ${newLockedStatus ? 'locked' : 'unlocked'}.`);
      // *** FIX: Added opening curly brace for the catch block ***
      } catch (error: any) {
          console.error(`Error toggling lock for chapter ${chapterId}:`, error);
          toast.error(`Failed to ${action.toLowerCase()} chapter: ${error.message}`);
      // *** FIX: Added closing curly brace for the catch block ***
      } finally {
          setChapterOperationStatus({ id: null, type: null });
      }
  };

  // *** FIX: Moved this function definition inside NovelPage component ***
  const handleChapterAdded = () => {
      setShowAddChapter(false);
      toast.success("Chapter added, reloading chapters...");
      setLoadingChapters(true);
      // Assert novelId is not null here as it's checked before rendering the button
      getNovelChapters(novelId!).then(fetchedChapters => {
          setChapters(fetchedChapters);
      }).catch(err => {
          console.error("[NovelPage] Error reloading chapters after add:", err);
          toast.error("Failed to reload chapters.");
          setChapters([]);
      }).finally(() => {
          setLoadingChapters(false);
      });
  };

  // *** FIX: Moved this function definition inside NovelPage component ***
  const handleBulkLockUnlock = async (lockStatus: boolean) => {
      if (!novel || !isAuthor || novelId === null) return;
      if (bulkLockLoading || chapterOperationStatus.id !== null) {
          toast.info("Please wait for current operations to complete.");
          return;
      }

      const action = lockStatus ? 'Locking' : 'Unlocking';
      const confirmMessage = lockStatus
          ? `Are you sure you want to lock all chapters for "${novel.title}"?`
          : `Are you sure you want to unlock all chapters for "${novel.title}"?`;
      if (!confirm(confirmMessage)) {
          return;
      }

      setBulkLockLoading(true);
      toast.info(`${action} all chapters...`);

      try {
          const success = await updateAllChaptersLockStatus(novelId, lockStatus);
          if (!success) throw new Error("API returned failure");
          setChapters((prevChapters: ChapterType[] | null) => { // Added type annotation
              if (!prevChapters) return null;
              return prevChapters.map((ch: ChapterType) => ({ ...ch, is_locked: lockStatus })); // Added type annotation
          });
          toast.success(`All chapters successfully ${lockStatus ? 'locked' : 'unlocked'}.`);
      } catch (error: any) {
          console.error(`Error ${action.toLowerCase()} all chapters:`, error);
          toast.error(`Failed to ${action.toLowerCase()} all chapters: ${error.message}`);
      } finally {
          setBulkLockLoading(false);
      }
  };

  // --- Render Logic ---
  if (loadingNovel || authLoading) {
    return <LoadingScreen message="Loading novel details..." />;
  }
  if (loadError?.includes("Invalid Novel ID")) {
      return <NotFoundScreen message={loadError} returnUrl="/" returnText="Return to Home" />;
  }
  if (loadError || !novel) {
    return <NotFoundScreen message={loadError || "Novel not found."} returnUrl="/" returnText="Return to Home"/>;
  }
  if (novelId === null) {
      return <NotFoundScreen message="Invalid Novel ID." returnUrl="/" returnText="Return to Home" />;
  }

  const isChapterOperationInProgress = chapterOperationStatus.id !== null;

  // --- Main Render ---
  // (JSX structure remains largely the same as provided in the previous correct step,
  // Ensure all state variables like novel, chapters, loadingChapters, isAuthor etc. are correctly referenced from component state)
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column - Cover and Info */}
          <div className="md:col-span-1">
            <div className="relative aspect-[2/3] w-full mb-4 shadow-lg rounded-lg overflow-hidden border border-border/10">
              <Image
                  src={novel.cover_url || '/placeholder-cover.png'}
                  alt={`Cover for ${novel.title}`}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  quality={85}
                  priority
                  className="object-cover"
                  placeholder="blur"
                  blurDataURL="/placeholder-cover-blur.png"
                  onError={(e) => {
                      console.warn(`Error loading image: ${novel.cover_url}`);
                      e.currentTarget.src = '/placeholder-cover.png';
                  }}
                />
            </div>
            {isAuthor && (
              <div className="mb-4">
                  <ImageUpload
                    onUploadComplete={async (url: string) => {
                      toast.info("Updating cover image...");
                      const { error } = await supabase
                          .from('novels')
                          .update({ cover_url: url })
                          .eq('id', novelId);

                      if (error) {
                          toast.error(`Error updating cover: ${error.message}`);
                          return;
                      }
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
                        disabled={bulkLockLoading || isChapterOperationInProgress || savingNovel}
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
                   <div className="flex items-center gap-2">
                       {!loadingChapters && chapters && chapters.length > 0 && (
                           <>
                               <Button
                                   onClick={() => handleBulkLockUnlock(true)}
                                   size="sm"
                                   variant="outline"
                                   className="gap-1 text-destructive border-destructive hover:bg-destructive/10"
                                   disabled={bulkLockLoading || isChapterOperationInProgress || savingNovel}
                               >
                                   {bulkLockLoading ? <LoadingSpinner className="mr-1" size="sm"/> : <Lock size={16} className="mr-1" />}
                                   Lock All
                               </Button>
                               <Button
                                   onClick={() => handleBulkLockUnlock(false)}
                                   size="sm"
                                   variant="outline"
                                   className="gap-1 text-green-600 border-green-600 hover:bg-green-500/10"
                                   disabled={bulkLockLoading || isChapterOperationInProgress || savingNovel}
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
                         disabled={loadingChapters || bulkLockLoading || isChapterOperationInProgress || savingNovel}
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
                  currentChapters={chapters}
                  onClose={() => setShowAddChapter(false)}
                  onSuccess={handleChapterAdded}
                />
              )}

              <div className="space-y-1">
                {loadingChapters ? (
                    <ChaptersSkeleton />
                ) : chapters && chapters.length > 0 ? (
                  [...chapters]
                    .sort((a, b) => a.chapter_number - b.chapter_number)
                    .map((chapter) => (
                       <ChapterTitleEditor
                           key={chapter.id}
                           chapter={chapter}
                           novelId={novelId}
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
                       />
                  ))
                ) : chapters !== null ? (
                  <p className="text-sm text-muted-foreground italic p-2">No chapters added yet.</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
// *** FIX: Removed the extra closing brace at the end of the file ***