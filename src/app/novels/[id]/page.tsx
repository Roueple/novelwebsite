// src/app/novels/[id]/page.tsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import { BookOpen, Edit, Trash2, Check, X, Plus, Lock, Unlock } from 'lucide-react'; // Added Lock, Unlock
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ImageUpload } from '@/components/ui/image-upload';
import { supabase } from '@/lib/supabase';
import { getNovel, deleteChapter, updateChapter, updateAllChaptersLockStatus } from '@/lib/api'; // Added updateAllChaptersLockStatus
import type { NovelType, ChapterType } from '@/types/supabase';
import Image from 'next/image';
import { useAuth } from '@/providers/auth-provider';
import AddChapterModal from '@/components/add-chapter-modal';
import LoadingScreen from '@/components/ui/loading-screen';
import NotFoundScreen from '@/components/ui/not-found-screen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/ui/loading-spinner'; // Import spinner
import { cn } from '@/lib/utils'; // Import cn for conditional classes

export default function NovelPage() {
  const { user, role } = useAuth();
  const params = useParams();
  const router = useRouter();
  const novelIdParam = params.id; // Get raw param first

  // State
  const [novelId, setNovelId] = useState<number | null>(null); // Store validated ID
  const [novel, setNovel] = useState<NovelType | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isAuthor, setIsAuthor] = useState(false);
  const [isEditingNovel, setIsEditingNovel] = useState(false);
  const [isEditingChapter, setIsEditingChapter] = useState<number | null>(null);
  const [editedNovelTitle, setEditedNovelTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedChapterTitle, setEditedChapterTitle] = useState('');
  const [showAddChapter, setShowAddChapter] = useState(false);
  const [savingNovel, setSavingNovel] = useState(false);
  const [savingChapter, setSavingChapter] = useState(false);
  const [deletingChapter, setDeletingChapter] = useState<number | null>(null);
  // State for bulk lock/unlock operations (single state for both)
  const [bulkLockLoading, setBulkLockLoading] = useState(false);
  // State for individual chapter lock/unlock operations (track which chapter is loading)
  const [chapterLockLoadingId, setChapterLockLoadingId] = useState<number | null>(null);


  // Validate novelIdParam on mount and when it changes
  useEffect(() => {
      const id = Number(novelIdParam);
      if (!isNaN(id) && id > 0) {
          setNovelId(id);
      } else {
          setLoadError("Invalid Novel ID provided in URL.");
          setLoading(false); // Stop loading if ID is invalid
          setNovelId(null);
      }
  }, [novelIdParam]);

  // Fetch Novel Data - depends on validated novelId
  const loadNovel = useCallback(async () => {
      if (novelId === null) { // Don't fetch if ID is invalid or not set yet
          setLoading(false);
          return;
      }
      console.log(`[NovelPage] Attempting to load novel ID: ${novelId}`);
      setLoading(true);
      setLoadError(null);
      try {
          const data = await getNovel(novelId);
          console.log("[NovelPage] Data received from getNovel:", data);
          if (data) {
              setNovel(data);
          } else {
              console.log("[NovelPage] getNovel returned null, setting error.");
              setLoadError("Novel not found or failed to load.");
          }
      } catch (err: any) {
          console.error("[NovelPage] Error during getNovel call:", err);
          setLoadError(err.message || "An unexpected error occurred while loading the novel.");
      } finally {
          console.log("[NovelPage] Loading finished.");
          setLoading(false);
      }
  }, [novelId]); // Re-run when novelId changes

  // Trigger loadNovel when novelId is validated and set
  useEffect(() => {
      if (novelId !== null) {
          loadNovel();
      }
  }, [novelId, loadNovel]);

  // Determine Author Status
  useEffect(() => {
    if (novel && user) {
      const isAdmin = role === 'admin';
      const isNovelAuthor = novel.author_id === user.id;
      setIsAuthor(isAdmin || isNovelAuthor);
      console.log(`[NovelPage] Author status determined: ${isAdmin || isNovelAuthor} (Role: ${role}, User ID: ${user?.id}, Author ID: ${novel.author_id})`);
    } else {
      setIsAuthor(false);
    }
  }, [novel, user, role]);

  // --- Handlers ---
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
        .eq('id', novelId); // Use validated novelId
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
    setEditedChapterTitle(chapter.title);
    setIsEditingChapter(chapter.id);
  };

  const handleCancelEditChapter = () => {
    setIsEditingChapter(null);
    setEditedChapterTitle('');
  };

  const handleSaveChapterTitle = async (chapterId: number) => {
     if (!novel || !isAuthor || novelId === null) return;
    setSavingChapter(true);
    toast.info("Saving chapter title...");
    try {
      // Pass novelId here
      const success = await updateChapter(novelId, chapterId, { title: editedChapterTitle.trim() });
      if (!success) throw new Error("API returned failure");

      setNovel(prev => {
        if (!prev) return null;
        return {
          ...prev,
          chapters: prev.chapters.map(ch =>
            ch.id === chapterId ? { ...ch, title: editedChapterTitle.trim() } : ch
          )
        };
      });
      setIsEditingChapter(null);
      toast.success("Chapter title updated!");
    } catch (error: any) {
      console.error('Error updating chapter title:', error);
      toast.error(`Failed to update chapter title: ${error.message}`);
    } finally {
      setSavingChapter(false);
    }
  };

  const handleDeleteChapterClick = async (chapterId: number, chapterNumber: number) => {
    if (!novel || !isAuthor || novelId === null) return;
    if (!confirm(`Are you sure you want to permanently delete Chapter ${chapterNumber}? This cannot be undone.`)) {
      return;
    }
    setDeletingChapter(chapterId);
    toast.info(`Deleting Chapter ${chapterNumber}...`);
    try {
       // Pass novelId here
       const success = await deleteChapter(novelId, chapterId);
       if (!success) throw new Error("API returned failure");

      setNovel(prev => {
        if (!prev) return null;
        // Renumber subsequent chapters after deletion
        let chapterCounter = 1;
        const updatedChapters = prev.chapters
            .filter(ch => ch.id !== chapterId)
            .sort((a, b) => a.chapter_number - b.chapter_number) // Ensure sorting before renumbering
            .map(ch => ({ ...ch, chapter_number: chapterCounter++ }));

        return {
          ...prev,
          chapters: updatedChapters
        };
      });
      toast.success(`Chapter ${chapterNumber} deleted successfully.`);
       // Optional: Trigger API calls to update the chapter_number in the database for remaining chapters
       // This can be complex and might be better handled via a backend function or delayed job.
       // For now, the UI reflects the renumbering, but the DB might not immediately.

    } catch (error: any) {
      console.error('Error deleting chapter:', error);
      toast.error(`Failed to delete chapter: ${error.message}`);
    } finally {
       setDeletingChapter(null);
    }
  };

  const handleChapterAdded = () => {
      setShowAddChapter(false);
      toast.success("Chapter added, reloading novel details...");
      loadNovel(); // Reload to get updated chapter list and correct numbering
  };

  // NEW: Handle bulk lock/unlock
  const handleBulkLockUnlock = async (lockStatus: boolean) => {
      if (!novel || !isAuthor || novelId === null) return;
      // Prevent multiple bulk operations or other saves simultaneously
      if (bulkLockLoading || savingNovel || savingChapter || deletingChapter || chapterLockLoadingId !== null) {
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

      setBulkLockLoading(true); // Use single state for both lock/unlock bulk loading
      toast.info(`${action} all chapters...`);

      try {
          const success = await updateAllChaptersLockStatus(novelId, lockStatus);
          if (!success) throw new Error("API returned failure");

          // Update local state to reflect the change
          setNovel(prev => {
              if (!prev) return null;
              return {
                  ...prev,
                  chapters: prev.chapters.map(ch => ({ ...ch, is_locked: lockStatus }))
              };
          });
          toast.success(`All chapters successfully ${lockStatus ? 'locked' : 'unlocked'}.`);
      } catch (error: any) {
          console.error(`Error ${action.toLowerCase()} all chapters:`, error);
          toast.error(`Failed to ${action.toLowerCase()} all chapters: ${error.message}`);
      } finally {
          setBulkLockLoading(false); // Use single state for both lock/unlock bulk loading
      }
  };

  // NEW: Handle individual chapter lock/unlock
  const handleToggleChapterLock = async (chapterId: number, currentLockedStatus: boolean) => {
      if (!novel || !isAuthor || novelId === null) return;
       // Prevent individual toggle if bulk operation is running or another individual toggle is running
      if (bulkLockLoading || savingNovel || savingChapter || deletingChapter || (chapterLockLoadingId !== null && chapterLockLoadingId !== chapterId)) {
          toast.info("Please wait for current operations to complete.");
          return;
      }

      const newLockedStatus = !currentLockedStatus;
      const action = newLockedStatus ? 'Locking' : 'Unlocking';

      setChapterLockLoadingId(chapterId); // Set loading state for this specific chapter
      toast.info(`${action} chapter...`);

      try {
          // Reuse the existing updateChapter API function
          const success = await updateChapter(novelId, chapterId, { is_locked: newLockedStatus });
          if (!success) throw new Error("API returned failure");

          // Update local state for the specific chapter
          setNovel(prev => {
              if (!prev) return null;
              return {
                  ...prev,
                  chapters: prev.chapters.map(ch =>
                      ch.id === chapterId ? { ...ch, is_locked: newLockedStatus } : ch
                  )
              };
          });
          toast.success(`Chapter successfully ${newLockedStatus ? 'locked' : 'unlocked'}.`);
      } catch (error: any) {
          console.error(`Error toggling lock for chapter ${chapterId}:`, error);
          toast.error(`Failed to ${action.toLowerCase()} chapter: ${error.message}`);
      } finally {
          setChapterLockLoadingId(null); // Clear loading state for this chapter
      }
  };


  // --- Render Logic ---
  if (loading) {
    return <LoadingScreen message="Loading novel details..." />;
  }

  // Handle invalid ID error specifically before checking !novel
  if (loadError?.includes("Invalid Novel ID")) {
      return <NotFoundScreen message={loadError} returnUrl="/" returnText="Return to Home" />;
  }

  if (loadError || !novel) {
    return <NotFoundScreen message={loadError || "Novel not found."} returnUrl="/" returnText="Return to Home" />;
  }

  // Ensure novelId is valid before rendering modal or other actions
  if (novelId === null) {
      return <NotFoundScreen message="Invalid Novel ID." returnUrl="/" returnText="Return to Home" />;
  }

  // --- Main Render ---
  console.log("[NovelPage] Rendering novel content for:", novel.title);
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column - Cover and Info */}
          <div className="md:col-span-1">
            <div className="relative aspect-[2/3] w-full mb-4 shadow-lg rounded-lg overflow-hidden border border-border/10"> {/* Added border */}
                 <Image
                  src={novel.cover_url || '/placeholder-cover.png'} // Use local placeholder
                  alt={`Cover for ${novel.title}`}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  quality={85}
                  priority // <--- Add priority prop
                  className="object-cover"
                  placeholder="blur" // Use blur placeholder
                  blurDataURL="/placeholder-cover-blur.png" // Provide blur placeholder URL
                  onError={(e) => {
                      console.warn(`Error loading image: ${novel.cover_url}`);
                      e.currentTarget.src = '/placeholder-cover.png'; // Fallback
                  }}
                />
            </div>
            {/* Author Edit: Image Upload */}
            {isAuthor && (
                <div className="mb-4">
                  <ImageUpload
                    onUploadComplete={async (url: string) => {
                      toast.info("Updating cover image...");
                      const { error } = await supabase
                          .from('novels')
                          .update({ cover_url: url })
                          .eq('id', novelId); // Use validated novelId

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
            {/* Static Info */}
            <div className="space-y-3 text-sm bg-card p-4 rounded-lg shadow border border-border/10"> {/* Added border */}
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
            <div className="bg-card rounded-lg shadow p-6 border border-border/10"> {/* Added border */}
              {isEditingNovel ? (
                // Novel Edit Form
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
                      disabled={savingNovel || !editedNovelTitle.trim()} // Disable if title is empty
                    >
                      {savingNovel ? <LoadingSpinner className="mr-2" size="sm"/> : null}
                      {savingNovel ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </div>
              ) : (
                // Novel Display View
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
                      >
                        <Edit size={18} />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">by {novel.author}</p>
                  {/* Use text-foreground/prose styles defined in globals.css */}
                  <div className="prose prose-sm sm:prose-base max-w-none dark:prose-invert whitespace-pre-line text-foreground">
                    {novel.description || <span className="italic text-muted-foreground">No description provided.</span>}
                  </div>
                </div>
              )}
            </div>

            {/* Chapters Section */}
            <div className="bg-card rounded-lg shadow p-6 border border-border/10"> {/* Added border */}
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-foreground">Chapters</h2>
                {isAuthor && (
                   <div className="flex items-center gap-2">
                       {/* NEW: Bulk Lock/Unlock Buttons */}
                       {novel.chapters && novel.chapters.length > 0 && (
                           <>
                               <Button
                                   onClick={() => handleBulkLockUnlock(true)}
                                   size="sm"
                                   variant="outline"
                                   className="gap-1 text-destructive border-destructive hover:bg-destructive/10"
                                   disabled={bulkLockLoading || savingNovel || savingChapter || deletingChapter !== null || chapterLockLoadingId !== null}
                               >
                                   {bulkLockLoading ? <LoadingSpinner className="mr-1" size="sm"/> : <Lock size={16} className="mr-1" />}
                                   Lock All
                               </Button>
                               <Button
                                   onClick={() => handleBulkLockUnlock(false)}
                                   size="sm"
                                   variant="outline"
                                   className="gap-1 text-green-600 border-green-600 hover:bg-green-500/10"
                                   disabled={bulkLockLoading || savingNovel || savingChapter || deletingChapter !== null || chapterLockLoadingId !== null}
                               >
                                   {bulkLockLoading ? <LoadingSpinner className="mr-1" size="sm"/> : <Unlock size={16} className="mr-1" />}
                                   Unlock All
                               </Button>
                           </>
                       )}
                       {/* Existing Add Chapter Button */}
                       <Button
                         onClick={() => setShowAddChapter(true)}
                         size="sm"
                         variant="outline" // Changed variant
                         disabled={bulkLockLoading || savingNovel || savingChapter || deletingChapter !== null || chapterLockLoadingId !== null}
                       >
                         <Plus size={16} className="mr-1" />
                         Add Chapter
                       </Button>
                   </div>
                )}
              </div>

              {/* Add Chapter Modal */}
              {showAddChapter && novel.chapters && novelId !== null && (
                <AddChapterModal
                  novelId={novelId} // Pass validated novelId
                  currentChapters={novel.chapters}
                  onClose={() => setShowAddChapter(false)}
                  onSuccess={handleChapterAdded}
                />
              )}

              {/* Chapter List */}
              <div className="space-y-1">
                {novel.chapters && novel.chapters.length > 0 ? (
                  // Sort chapters by chapter_number before mapping
                  [...novel.chapters]
                    .sort((a, b) => a.chapter_number - b.chapter_number)
                    .map((chapter) => (
                      <div
                        key={chapter.id}
                        className="flex items-center justify-between p-2 rounded-md hover:bg-accent group" // Added group for hover effects
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0"> {/* Added min-w-0 */}
                          <BookOpen size={18} className="text-muted-foreground flex-shrink-0" />
                          {isEditingChapter === chapter.id ? (
                            // Chapter Title Edit Input
                            <div className="flex-1 flex items-center gap-2 min-w-0"> {/* Added min-w-0 */}
                              <Input
                                  type="text"
                                  value={editedChapterTitle}
                                  onChange={(e) => setEditedChapterTitle(e.target.value)}
                                  className="flex-grow h-8 text-sm" // Smaller input
                                  disabled={savingChapter}
                                  aria-label={`Edit title for chapter ${chapter.chapter_number}`}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleCancelEditChapter}
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                disabled={savingChapter}
                                aria-label="Cancel editing chapter title"
                              >
                                <X size={16} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleSaveChapterTitle(chapter.id)}
                                className="h-7 w-7 text-green-600 hover:text-green-500 hover:bg-green-500/10" // Added hover text color
                                disabled={savingChapter || editedChapterTitle.trim() === ''}
                                aria-label="Save chapter title"
                              >
                                {savingChapter ? <LoadingSpinner size="sm" className="text-green-600"/> : <Check size={16} />}
                              </Button>
                            </div>
                          ) : (
                            // Chapter Title Display/Link
                            <Link
                              href={`/novels/${novelId}/chapter/${chapter.chapter_number}`}
                              className="flex-1 flex items-center justify-between min-w-0 mr-2 group/link" // Add group name
                            >
                              <span className="text-sm text-foreground truncate group-hover/link:text-primary group-hover/link:underline underline-offset-2"> {/* Target specific group */}
                                Chapter {chapter.chapter_number}: {chapter.title}
                              </span>
                              {/* Individual Lock Status Indicator */}
                              {chapter.is_locked && (
                                <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-secondary text-muted-foreground flex-shrink-0">
                                  Locked
                                </span>
                              )}
                            </Link>
                          )}
                        </div>

                        {/* Author Controls for Chapter */}
                        {isAuthor && (
                          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                             {/* Individual Lock Toggle Button */}
                             <Button
                                 variant="ghost"
                                 size="icon"
                                 onClick={() => handleToggleChapterLock(chapter.id, chapter.is_locked)}
                                 className={cn(
                                     "h-7 w-7 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity",
                                     chapter.is_locked ? 'text-destructive' : 'text-green-600',
                                     { 'opacity-100': chapterLockLoadingId === chapter.id } // Always show spinner if loading
                                 )}
                                 disabled={
                                     isEditingChapter !== null || // Disable if editing title of any chapter
                                     savingChapter || // Disable if saving title of any chapter
                                     deletingChapter !== null || // Disable if deleting any chapter
                                     bulkLockLoading || // Disable if bulk operation is running
                                     (chapterLockLoadingId !== null && chapterLockLoadingId !== chapter.id) // Disable if another chapter is toggling lock
                                 }
                                 aria-label={chapter.is_locked ? `Unlock chapter ${chapter.chapter_number}` : `Lock chapter ${chapter.chapter_number}`}
                             >
                                 {chapterLockLoadingId === chapter.id ? (
                                     <LoadingSpinner size="sm" className={chapter.is_locked ? 'text-destructive' : 'text-green-600'}/>
                                 ) : chapter.is_locked ? (
                                     <Lock size={16} />
                                 ) : (
                                     <Unlock size={16} />
                                 )}
                             </Button>

                            {isEditingChapter !== chapter.id && ( // Show edit only if not currently editing this one
                              <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleStartEditChapter(chapter)}
                                  className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity" // Show on hover/focus
                                  disabled={
                                     isEditingChapter !== null || // Disable if editing title of any other chapter
                                     savingChapter || // Disable if saving title of any chapter
                                     deletingChapter !== null || // Disable if deleting any chapter
                                     bulkLockLoading || // Disable if bulk operation is running
                                     chapterLockLoadingId !== null // Disable if any chapter is toggling lock
                                  }
                                  aria-label={`Edit chapter ${chapter.chapter_number} title`}
                              >
                                  <Edit size={16} />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteChapterClick(chapter.id, chapter.chapter_number)}
                              className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity" // Show on hover/focus
                              disabled={
                                  deletingChapter === chapter.id || // Disable while deleting this specific chapter
                                  isEditingChapter !== null || // Disable if editing title of any chapter
                                  savingChapter || // Disable if saving title of any chapter
                                  bulkLockLoading || // Disable if bulk operation is running
                                  chapterLockLoadingId !== null // Disable if any chapter is toggling lock
                              }
                              aria-label={`Delete chapter ${chapter.chapter_number}`}
                            >
                              {deletingChapter === chapter.id ? (
                                  <LoadingSpinner size="sm" className="text-destructive"/>
                              ) : (
                                <Trash2 size={16} />
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground italic p-2">No chapters added yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
