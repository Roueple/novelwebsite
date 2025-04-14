"use client";

import { useState, useEffect, useCallback } from 'react'; // Added useCallback
import { BookOpen, Edit, Trash2, Check, X, Plus } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation'; // Added useRouter
import { ImageUpload } from '@/components/ui/image-upload';
import { supabase } from '@/lib/supabase';
import { getNovel, deleteChapter, updateChapter } from '@/lib/api'; // Added deleteChapter, updateChapter
import type { NovelType, ChapterType } from '@/types/supabase'; // Use ChapterType
import Image from 'next/image';
import { useAuth } from '@/providers/auth-provider';
import AddChapterModal from '@/components/add-chapter-modal';
import LoadingScreen from '@/components/ui/loading-screen'; // Import LoadingScreen
import NotFoundScreen from '@/components/ui/not-found-screen'; // Import NotFoundScreen
import { Button } from '@/components/ui/button'; // Import Button
import { Input } from '@/components/ui/input'; // Import Input
import { Textarea } from '@/components/ui/textarea'; // Import Textarea
import { toast } from 'sonner'; // Import toast

export default function NovelPage() {
  const { user, role } = useAuth();
  const params = useParams();
  const router = useRouter(); // Initialize router
  const novelId = Number(params.id);

  const [novel, setNovel] = useState<NovelType | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null); // State for load errors
  const [isAuthor, setIsAuthor] = useState(false);
  const [isEditingNovel, setIsEditingNovel] = useState(false);
  const [isEditingChapter, setIsEditingChapter] = useState<number | null>(null);
  const [editedNovelTitle, setEditedNovelTitle] = useState(''); // Separate state for novel edit
  const [editedDescription, setEditedDescription] = useState(''); // Separate state for novel edit
  const [editedChapterTitle, setEditedChapterTitle] = useState(''); // State for chapter title edit
  const [showAddChapter, setShowAddChapter] = useState(false);
  const [savingNovel, setSavingNovel] = useState(false); // Saving state for novel details
  const [savingChapter, setSavingChapter] = useState(false); // Saving state for chapter title
  const [deletingChapter, setDeletingChapter] = useState<number | null>(null); // Track deleting chapter

  // Fetch Novel Data
  const loadNovel = useCallback(async () => {
    console.log(`[NovelPage] Attempting to load novel ID: ${novelId}`); // LOG: Start loading
    if (isNaN(novelId)) {
      console.error("[NovelPage] Invalid novel ID detected.");
      setLoadError("Invalid Novel ID provided in URL.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null); // Reset error on new load attempt
    try {
      const data = await getNovel(novelId);
      console.log("[NovelPage] Data received from getNovel:", data); // LOG: Data received
      if (data) {
        setNovel(data);
      } else {
        console.log("[NovelPage] getNovel returned null, setting error.");
        setLoadError("Novel not found or failed to load."); // Set specific error
      }
    } catch (err: any) { // Catch potential errors during the call itself
       console.error("[NovelPage] Error during getNovel call:", err);
       setLoadError(err.message || "An unexpected error occurred while loading the novel.");
    } finally {
      console.log("[NovelPage] Loading finished."); // LOG: Loading finished
      setLoading(false);
    }
  }, [novelId]); // Dependency is novelId

  useEffect(() => {
    loadNovel();
  }, [loadNovel]); // Run loadNovel when the component mounts or novelId changes

  // Determine Author Status
  useEffect(() => {
    if (novel && user) {
      const isAdmin = role === 'admin';
      const isNovelAuthor = novel.author_id === user.id;
      setIsAuthor(isAdmin || isNovelAuthor);
       console.log(`[NovelPage] Author status determined: ${isAdmin || isNovelAuthor} (Role: ${role}, User ID: ${user.id}, Author ID: ${novel.author_id})`); // LOG: Author status
    } else {
       setIsAuthor(false); // Reset if novel or user is not available
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
    // Reset edit fields if needed, though they get reset on next edit start
  };

  const handleSaveNovelDetails = async () => {
    if (!novel || !isAuthor) return;
    setSavingNovel(true);
    toast.info("Saving novel details...");
    try {
      const { error } = await supabase
        .from('novels')
        .update({
          title: editedNovelTitle.trim(),
          description: editedDescription.trim()
        })
        .eq('id', novel.id);

      if (error) throw error;

      // Update local state optimistically/after success
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
    setEditedChapterTitle(''); // Clear edit field
  };

  const handleSaveChapterTitle = async (chapterId: number) => {
     if (!novel || !isAuthor) return;
    setSavingChapter(true);
    toast.info("Saving chapter title...");
    try {
      const success = await updateChapter(novel.id, chapterId, { title: editedChapterTitle.trim() });

      if (!success) throw new Error("API returned failure");

      // Update local state
      setNovel(prev => {
        if (!prev) return null;
        return {
          ...prev,
          chapters: prev.chapters.map(ch =>
            ch.id === chapterId ? { ...ch, title: editedChapterTitle.trim() } : ch
          )
        };
      });

      setIsEditingChapter(null); // Exit edit mode for this chapter
      toast.success("Chapter title updated!");
    } catch (error: any) {
      console.error('Error updating chapter title:', error);
      toast.error(`Failed to update chapter title: ${error.message}`);
    } finally {
      setSavingChapter(false);
    }
  };

  const handleDeleteChapterClick = async (chapterId: number, chapterNumber: number) => {
    if (!novel || !isAuthor) return;
    if (!confirm(`Are you sure you want to permanently delete Chapter ${chapterNumber}? This cannot be undone.`)) {
      return;
    }
    setDeletingChapter(chapterId); // Indicate which chapter is being deleted
    toast.info(`Deleting Chapter ${chapterNumber}...`);
    try {
       const success = await deleteChapter(novel.id, chapterId);
       if (!success) throw new Error("API returned failure");

      // Update local state on success
      setNovel(prev => {
        if (!prev) return null;
        return {
          ...prev,
          chapters: prev.chapters.filter(ch => ch.id !== chapterId)
                                  // Optional: Renumber subsequent chapters if desired (more complex)
        };
      });
      toast.success(`Chapter ${chapterNumber} deleted successfully.`);
    } catch (error: any) {
      console.error('Error deleting chapter:', error);
      toast.error(`Failed to delete chapter: ${error.message}`);
    } finally {
       setDeletingChapter(null); // Reset deleting indicator
    }
  };

  const handleChapterAdded = () => {
      setShowAddChapter(false);
      toast.success("Chapter added, reloading novel details...");
      loadNovel(); // Reload novel data to get the updated chapter list
  };


  // --- Render Logic ---

  if (loading) {
     console.log("[NovelPage] Rendering LoadingScreen..."); // LOG: Render loading
    return <LoadingScreen message="Loading novel details..." />;
  }

  if (loadError || !novel) {
     console.log("[NovelPage] Rendering NotFoundScreen due to error or missing novel.", { loadError, novelExists: !!novel }); // LOG: Render error/not found
    return <NotFoundScreen message={loadError || "Novel not found."} returnUrl="/" returnText="Return to Home" />;
  }

  // --- Main Render ---
  console.log("[NovelPage] Rendering novel content for:", novel.title); // LOG: Render content
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column - Cover and Info */}
          <div className="md:col-span-1">
            <div className="relative aspect-[2/3] w-full mb-4 shadow-md rounded-lg overflow-hidden">
                <Image
                  src={novel.cover_url || '/api/placeholder/400/600'} // Use a consistent placeholder API or local file
                  alt={`Cover for ${novel.title}`}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw" // Adjusted sizes
                  quality={85} // Slightly lower quality for faster load
                  priority // Load cover image eagerly
                  className="object-cover"
                  onError={(e) => { // Basic error handling for images
                      console.warn(`Error loading image: ${novel.cover_url}`);
                      e.currentTarget.src = '/api/placeholder/400/600'; // Fallback placeholder
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
                        .eq('id', novel.id);

                      if (error) {
                        toast.error(`Error updating cover: ${error.message}`);
                        return;
                      }
                       // Update local state immediately
                      setNovel(prev => prev ? { ...prev, cover_url: url } : null);
                      toast.success("Cover image updated!");
                    }}
                  />
                </div>
            )}
            {/* Static Info */}
            <div className="space-y-3 text-sm bg-card p-4 rounded-lg shadow">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-muted-foreground">Rating</span>
                  <span className="text-yellow-500 font-semibold">★ {novel.rating?.toFixed(1) ?? 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-muted-foreground">Status</span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    novel.status === 'Ongoing'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
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
            <div className="bg-card rounded-lg shadow p-6">
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
                      className="w-full" // Uses theme classes from Input component
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
                      className="w-full" // Uses theme classes from Textarea component
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
                       disabled={savingNovel}
                    >
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
                  <div className="prose prose-sm sm:prose-base max-w-none text-foreground dark:prose-invert whitespace-pre-line">
                    {novel.description || <span className="italic">No description provided.</span>}
                  </div>
                </div>
              )}
            </div>

            {/* Chapters Section */}
            <div className="bg-card rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-foreground">Chapters</h2>
                {isAuthor && (
                  <Button
                    onClick={() => setShowAddChapter(true)}
                    size="sm"
                  >
                    <Plus size={16} className="mr-1" />
                    Add Chapter
                  </Button>
                )}
              </div>

              {/* Add Chapter Modal */}
              {showAddChapter && novel.chapters && (
                <AddChapterModal
                  novelId={novel.id}
                  currentChapters={novel.chapters}
                  onClose={() => setShowAddChapter(false)}
                  onSuccess={handleChapterAdded} // Use the new handler
                />
              )}

              {/* Chapter List */}
              <div className="space-y-1">
                {novel.chapters && novel.chapters.length > 0 ? novel.chapters.map((chapter) => (
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
                              className="h-7 w-7 text-green-600 hover:bg-green-500/10"
                              disabled={savingChapter || editedChapterTitle.trim() === ''}
                              aria-label="Save chapter title"
                           >
                              <Check size={16} />
                           </Button>
                        </div>
                      ) : (
                        // Chapter Title Display/Link
                        <Link
                          href={`/novels/${novel.id}/chapter/${chapter.chapter_number}`}
                          className="flex-1 flex items-center justify-between min-w-0 mr-2" // Added min-w-0 and margin
                        >
                          <span className="text-sm text-foreground truncate group-hover:text-primary">
                            Chapter {chapter.chapter_number}: {chapter.title}
                          </span>
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
                        {isEditingChapter !== chapter.id && ( // Show edit only if not currently editing this one
                           <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleStartEditChapter(chapter)}
                              className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 focus:opacity-100" // Show on hover/focus
                              aria-label={`Edit chapter ${chapter.chapter_number} title`}
                           >
                              <Edit size={16} />
                           </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteChapterClick(chapter.id, chapter.chapter_number)}
                          className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 focus:opacity-100" // Show on hover/focus
                           disabled={deletingChapter === chapter.id} // Disable while deleting this specific chapter
                           aria-label={`Delete chapter ${chapter.chapter_number}`}
                        >
                           {deletingChapter === chapter.id ? (
                              <div className="animate-spin h-4 w-4 border-2 border-destructive border-t-transparent rounded-full"></div>
                           ) : (
                             <Trash2 size={16} />
                           )}
                        </Button>
                      </div>
                    )}
                  </div>
                )) : (
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