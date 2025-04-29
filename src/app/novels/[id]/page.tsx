// src/app/novels/[id]/page.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react'; // Added useMemo
import {
    BookOpen, Edit, Trash2, Plus, Lock, Unlock,
    ArrowDownNarrowWide, ArrowUpWideNarrow // Icons for sorting
} from 'lucide-react'; // Removed Check, X as they are within ChapterTitleEditor
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ImageUpload } from '@/components/ui/image-upload';
import { supabase } from '@/lib/supabase';
import { getNovel, getNovelChapters, deleteChapter, updateChapter, updateAllChaptersLockStatus } from '@/lib/api';
import type { Novel, ChapterType } from '@/types/supabase';
import Image from 'next/image';
import { useAuth } from '@/providers/auth-provider';
import AddChapterModal from '@/components/add-chapter-modal';
import NotFoundScreen from '@/components/ui/not-found-screen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { cn } from '@/lib/utils';
import ChapterTitleEditor from '@/components/chapter-title-editor';

// --- Skeleton Components (Remain the same as previous version) ---

// Skeleton Loader for Chapters List
function ChaptersSkeleton() { /* ... */ }
// Skeleton for Left Column (Cover + Stats)
function LeftColumnSkeleton() { /* ... */ }
// Skeleton for Right Column (Details + Chapters Section)
function RightColumnSkeleton() { /* ... */ }

export default function NovelPage() {
  // --- Hooks and State ---
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
  const [isEditingNovel, setIsEditingNovel] = useState(false);
  const [isEditingChapterId, setIsEditingChapterId] = useState<number | null>(null);
  const [editedNovelTitle, setEditedNovelTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [showAddChapter, setShowAddChapter] = useState(false);
  const [savingNovel, setSavingNovel] = useState(false);
  const [chapterOperationStatus, setChapterOperationStatus] = useState<{ id: number | null; type: string | null; }>({ id: null, type: null });
  const [bulkLockLoading, setBulkLockLoading] = useState(false);
  const [chapterSortOrder, setChapterSortOrder] = useState<'asc' | 'desc'>('asc'); // <-- NEW: Sort state

  // --- Effects ---

  // Validate novelIdParam (remains the same)
  useEffect(() => { /* ... */ }, [novelIdParam, novelId]);

  // Fetch Novel Metadata (remains the same, depends on authLoading)
  const loadNovelAndChapters = useCallback(async () => { /* ... */ }, [novelId, authLoading]);

  // Trigger loadNovelAndChapters (remains the same)
  useEffect(() => { /* ... */ }, [novelId, authLoading, loadNovelAndChapters]);

  // Determine Author Status (remains the same)
  useEffect(() => { /* ... */ }, [role, authLoading, user, isAuthor]);


  // --- Handlers --- (Keep all handlers as they were)
  const handleStartEditNovel = () => { /* ... */ };
  const handleCancelEditNovel = () => { /* ... */ };
  const handleSaveNovelDetails = async () => { /* ... */ };
  const handleStartEditChapter = (chapter: ChapterType) => { /* ... */ };
  const handleCancelEditChapter = () => { /* ... */ };
  const handleSaveChapterTitle = async (chapterId: number, newTitle: string) => { /* ... */ };
  const handleDeleteChapter = async (chapterId: number, chapterNumber: number) => { /* ... */ };
  const handleToggleChapterLock = async (chapterId: number, currentLockedStatus: boolean) => { /* ... */ };
  const handleChapterAdded = useCallback(() => { /* ... */ }, [novelId]);
  const handleBulkLockUnlock = async (lockStatus: boolean) => { /* ... */ };

  // <-- NEW: Handler to toggle chapter sort order -->
  const toggleChapterSort = () => {
    setChapterSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  // <-- NEW: Memoize the sorted chapter list -->
  const sortedChapters = useMemo(() => {
    if (!chapters) return [];
    // Create a copy before sorting to avoid mutating the original state
    const chaptersCopy = [...chapters];
    return chaptersCopy.sort((a, b) => {
      if (chapterSortOrder === 'asc') {
        return a.chapter_number - b.chapter_number;
      } else {
        return b.chapter_number - a.chapter_number;
      }
    });
  }, [chapters, chapterSortOrder]); // Re-sort when chapters or sortOrder changes


  // --- Render Logic ---

  // Error Handling (remains the same)
  if (loadError?.includes("Invalid Novel ID")) { /* ... */ }
  if (!dataLoading && loadError) { /* ... */ }

  const isAnyChapterOperationInProgress = chapterOperationStatus.id !== null || bulkLockLoading;
  const showSkeletons = dataLoading || authLoading;

  // --- Main Render ---
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Left Column - Cover and Info */}
            {showSkeletons ? (
                <LeftColumnSkeleton />
            ) : novel ? (
                <div className="md:col-span-1">
                    {/* Actual Cover Image */}
                    <div className="relative aspect-[2/3] w-full mb-4 shadow-lg rounded-lg overflow-hidden border border-border/10">
                        {!novel.cover_url ? ( /* ... placeholder ... */ ) : ( <Image src={novel.cover_url} /* ... */ /> )}
                    </div>
                    {/* Edit Controls */}
                    {isAuthor && ( <div className="mb-4"> <ImageUpload onUploadComplete={async (url: string) => { /* ... */ }} /> </div> )}
                    {/* Stats Card */}
                    <div className="space-y-3 text-sm bg-card p-4 rounded-lg shadow border border-border/10">
                        {/* ... Rating, Status, Tags rendering ... */}
                         <div className="flex items-center justify-between">
                            <span className="font-medium text-muted-foreground">Rating</span>
                            <span className="text-yellow-500 font-semibold">★ {novel.rating?.toFixed(1) ?? 'N/A'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-muted-foreground">Status</span>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${ novel.status === 'Ongoing' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' }`}>
                              {novel.status}
                            </span>
                           </div>
                          <div className="pt-1">
                           <span className="font-medium text-muted-foreground mb-1 block">Tags</span>
                            <div className="flex flex-wrap gap-1 ">
                              {novel.tags?.map((tag) => (<span key={tag} className="px-2 py-0.5 text-xs rounded-full bg-secondary text-secondary-foreground">{tag}</span>))}
                              {(!novel.tags || novel.tags.length === 0) && <span className="text-xs text-muted-foreground italic">No tags</span>}
                            </div>
                          </div>
                    </div>
                </div>
            ) : ( <LeftColumnSkeleton /> )}

            {/* Right Column - Description and Chapters */}
            {showSkeletons ? (
                <RightColumnSkeleton />
            ) : novel ? (
                 <div className="md:col-span-2 space-y-6">
                    {/* Title and Description Section */}
                    <div className="bg-card rounded-lg shadow p-6 border border-border/10">
                        {isEditingNovel ? ( /* ... Edit Form ... */ ) : ( /* ... Display Details ... */ )}
                    </div>

                    {/* Chapters Section - UPDATED */}
                    <div className="bg-card rounded-lg shadow p-6 border border-border/10">
                        <div className="flex justify-between items-center mb-4 flex-wrap gap-2"> {/* Added flex-wrap and gap */}
                            {/* Chapters Title and Sort Button */}
                            <div className='flex items-center gap-2'>
                                <h2 className="text-xl font-semibold text-foreground">Chapters</h2>
                                {chapters && chapters.length > 1 && ( // Only show sort if more than 1 chapter
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={toggleChapterSort}
                                        className="h-8 px-2 text-muted-foreground hover:text-foreground"
                                        title={`Sort chapters ${chapterSortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                                        disabled={isAnyChapterOperationInProgress || savingNovel}
                                    >
                                        {chapterSortOrder === 'asc' ? (
                                            <ArrowDownNarrowWide size={16} />
                                        ) : (
                                            <ArrowUpWideNarrow size={16} />
                                        )}
                                        <span className="sr-only">Toggle Sort Order</span>
                                    </Button>
                                )}
                            </div>
                            {/* Author Chapter Actions */}
                            {isAuthor && (
                                <div className="flex items-center gap-2 flex-wrap">
                                    {/* Bulk Lock/Unlock and Add Chapter Buttons */}
                                    {/* ... (buttons remain the same) ... */}
                                    {chapters && chapters.length > 0 && (
                                        <>
                                            <Button onClick={() => handleBulkLockUnlock(true)} size="sm" variant="outline" className="gap-1 text-destructive border-destructive hover:bg-destructive/10" disabled={isAnyChapterOperationInProgress || savingNovel}>
                                                {bulkLockLoading ? <LoadingSpinner className="mr-1" size="sm"/> : <Lock size={16} className="mr-1" />} Lock All
                                            </Button>
                                            <Button onClick={() => handleBulkLockUnlock(false)} size="sm" variant="outline" className="gap-1 text-green-600 border-green-600 hover:bg-green-500/10" disabled={isAnyChapterOperationInProgress || savingNovel}>
                                                {bulkLockLoading ? <LoadingSpinner className="mr-1" size="sm"/> : <Unlock size={16} className="mr-1" />} Unlock All
                                            </Button>
                                        </>
                                    )}
                                    <Button onClick={() => setShowAddChapter(true)} size="sm" variant="outline" disabled={isAnyChapterOperationInProgress || savingNovel}>
                                        <Plus size={16} className="mr-1" /> Add Chapter
                                    </Button>
                                </div>
                            )}
                        </div>

                        {showAddChapter && chapters !== null && novelId !== null && (
                            <AddChapterModal /* ... props ... */ />
                        )}

                        <div className="space-y-1">
                            {/* Show skeleton if chapters are null (still loading) */}
                            {chapters === null ? (
                                <ChaptersSkeleton />
                            ) : sortedChapters.length > 0 ? ( // <-- Use sortedChapters for mapping
                                sortedChapters.map((chapter) => ( // <-- Iterate over sorted list
                                    <ChapterTitleEditor
                                        key={chapter.id}
                                        chapter={chapter}
                                        novelId={novelId!}
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
                                        disabled={savingNovel}
                                    />
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground italic p-2">No chapters added yet.</p>
                            )}
                        </div>
                    </div>
                </div>
            ) : ( <RightColumnSkeleton /> )}
          </div>
      </div>
    </div>
  );
}