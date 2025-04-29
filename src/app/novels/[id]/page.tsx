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
import NotFoundScreen from '@/components/ui/not-found-screen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { cn } from '@/lib/utils';
import ChapterTitleEditor from '@/components/chapter-title-editor';

// --- Skeleton Components ---

// Skeleton Loader for Chapters List
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

// Skeleton for Left Column (Cover + Stats)
function LeftColumnSkeleton() {
    return (
        <div className="md:col-span-1 space-y-4 animate-pulse">
            {/* Cover Skeleton */}
            <div className="relative aspect-[2/3] w-full bg-muted rounded-lg shadow-lg"></div>
            {/* Image Upload Skeleton (optional, can be hidden or shown) */}
            {/* <div className="h-10 bg-muted rounded-md"></div> */}
            {/* Stats Card Skeleton */}
            <div className="space-y-3 bg-card p-4 rounded-lg shadow border border-border/10">
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
    );
}

// Skeleton for Right Column (Details + Chapters Section)
function RightColumnSkeleton() {
    return (
        <div className="md:col-span-2 space-y-6 animate-pulse">
            {/* Title/Desc Skeleton */}
            <div className="bg-card rounded-lg shadow p-6 border border-border/10 space-y-3">
                <div className="flex justify-between items-start">
                    <div className="h-8 bg-muted rounded w-3/4"></div>
                    {/* Placeholder for edit button area */}
                    <div className="h-8 w-8 bg-muted rounded-md"></div>
                </div>
                <div className="h-4 bg-muted rounded w-1/4"></div> {/* Author placeholder */}
                <div className="space-y-2 pt-2"> {/* Description placeholder */}
                    <div className="h-4 bg-muted rounded w-full"></div>
                    <div className="h-4 bg-muted rounded w-full"></div>
                    <div className="h-4 bg-muted rounded w-5/6"></div>
                </div>
            </div>
            {/* Chapters Section Skeleton */}
            <div className="bg-card rounded-lg shadow p-6 border border-border/10">
                <div className="flex justify-between items-center mb-4">
                    <div className="h-6 bg-muted rounded w-1/3"></div>
                    {/* Placeholder for chapter action buttons */}
                    <div className="flex gap-2">
                         <div className="h-8 w-24 bg-muted rounded-md"></div>
                         <div className="h-8 w-28 bg-muted rounded-md"></div>
                         <div className="h-8 w-28 bg-muted rounded-md"></div>
                    </div>
                </div>
                <ChaptersSkeleton />
            </div>
        </div>
    );
}


export default function NovelPage() {
  // --- Hooks and State ---
  const { user, role, loading: authLoading } = useAuth(); // Get auth loading state
  const params = useParams();
  const router = useRouter();
  const novelIdParam = params.id;

  const [novelId, setNovelId] = useState<number | null>(null);
  const [novel, setNovel] = useState<Novel | null>(null);
  const [chapters, setChapters] = useState<ChapterType[] | null>(null);
  const [dataLoading, setDataLoading] = useState(true); // Combined loading state for novel/chapters
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

  // Validate novelIdParam
  useEffect(() => {
      const id = Number(novelIdParam);
      if (!isNaN(id) && id > 0) {
          if (id !== novelId) { // Reset only if ID actually changes
            setNovelId(id);
            setNovel(null);
            setChapters(null);
            setLoadError(null);
            setDataLoading(true); // Start loading when ID is set/changed
            setIsAuthor(false); // Reset author status on ID change
          }
      } else {
          setLoadError("Invalid Novel ID provided in URL.");
          setDataLoading(false);
          setNovelId(null);
      }
  }, [novelIdParam, novelId]); // Add novelId to dependencies

  // Fetch Novel Metadata (Combined Novel & Chapters Fetch)
  const loadNovelAndChapters = useCallback(async () => {
      if (novelId === null || authLoading) { // Wait for valid ID AND auth loading complete
          return;
      }
      console.log(`[NovelPage] Attempting to load novel (${novelId}) and chapters. Auth loaded: ${!authLoading}`);
      setDataLoading(true);
      setLoadError(null);

      try {
          // Fetch concurrently
          const [novelData, chaptersData] = await Promise.all([
               getNovel(novelId),
               getNovelChapters(novelId)
          ]);

          console.log("[NovelPage] Metadata received:", novelData);
          console.log("[NovelPage] Chapters received:", chaptersData);

          if (novelData) {
              setNovel(novelData);
              setChapters(chaptersData || []);
              setEditedNovelTitle(novelData.title); // Initialize edit fields
              setEditedDescription(novelData.description || '');
          } else {
              console.log("[NovelPage] getNovel returned null, setting error.");
              setLoadError("Novel not found or failed to load.");
              setNovel(null);
              setChapters(null);
          }
      } catch (err: any) {
          console.error("[NovelPage] Error during data fetch:", err);
          setLoadError(err.message || "An unexpected error occurred while loading data.");
          setNovel(null);
          setChapters(null);
      } finally {
          console.log("[NovelPage] Data loading attempt finished.");
          setDataLoading(false);
      }
  }, [novelId, authLoading]); // Add authLoading dependency

  // Trigger loadNovelAndChapters only when novelId is valid and auth is loaded
  useEffect(() => {
      if (novelId !== null && !authLoading) {
          loadNovelAndChapters();
      }
      // Reset loading state if auth is still loading or ID is null
      if (authLoading || novelId === null) {
          setDataLoading(true);
      }
  }, [novelId, authLoading, loadNovelAndChapters]);

  // Determine Author Status only after auth is loaded
  useEffect(() => {
    if (!authLoading) { // Check only when auth is not loading
        const isAdmin = user !== null && role === 'admin';
        // Update only if the status changes
        if (isAdmin !== isAuthor) {
             setIsAuthor(isAdmin);
        }
        console.log(`[NovelPage] Author status checked: ${isAdmin} (Role: ${role}, AuthLoading: ${authLoading})`);
    } else {
        // While auth is loading, assume not author
        if (isAuthor) setIsAuthor(false);
    }
    // Add user dependency as well
  }, [role, authLoading, user, isAuthor]);

  // --- Handlers --- (Keep all handlers as they were, no changes needed for them)
  const handleStartEditNovel = () => { /* ... */ };
  const handleCancelEditNovel = () => { /* ... */ };
  const handleSaveNovelDetails = async () => { /* ... */ };
  const handleStartEditChapter = (chapter: ChapterType) => { /* ... */ };
  const handleCancelEditChapter = () => { /* ... */ };
  const handleSaveChapterTitle = async (chapterId: number, newTitle: string) => { /* ... */ };
  const handleDeleteChapter = async (chapterId: number, chapterNumber: number) => { /* ... */ };
  const handleToggleChapterLock = async (chapterId: number, currentLockedStatus: boolean) => { /* ... */ };
  const handleChapterAdded = useCallback(() => { /* ... */ }, [novelId]); // Keep novelId dep
  const handleBulkLockUnlock = async (lockStatus: boolean) => { /* ... */ };


  // --- Render Logic ---

  // Handle invalid ID error first
  if (loadError?.includes("Invalid Novel ID")) {
      return <NotFoundScreen message={loadError} returnUrl="/" returnText="Return to Home" />;
  }

  // Handle other load errors *only if* data isn't loading anymore
  if (!dataLoading && loadError) {
    return <NotFoundScreen message={loadError} returnUrl="/" returnText="Return to Home"/>;
  }

  // Use a variable to track if any operation is in progress
  const isAnyChapterOperationInProgress = chapterOperationStatus.id !== null || bulkLockLoading;

  // Determine if we should show skeletons
  const showSkeletons = dataLoading || authLoading; // Show skeleton if EITHER data or auth is loading

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
                        {!novel.cover_url ? (
                            <div className="absolute inset-0 bg-muted flex items-center justify-center">
                                <BookOpen className="h-16 w-16 text-muted-foreground/50" />
                            </div>
                        ) : (
                            <Image
                                src={novel.cover_url} alt={`Cover for ${novel.title}`} fill
                                sizes="(max-width: 768px) 100vw, 33vw" quality={85} priority
                                className="object-cover" placeholder="blur" blurDataURL="/placeholder-cover-blur.png"
                                onError={(e) => { e.currentTarget.src = '/placeholder-cover.png'; e.currentTarget.srcset = ''; }}
                            />
                        )}
                    </div>
                    {/* Edit Controls (visible if author) */}
                    {isAuthor && (
                        <div className="mb-4">
                            <ImageUpload onUploadComplete={async (url: string) => { /* ... (upload logic) ... */ }} />
                        </div>
                    )}
                    {/* Stats Card */}
                    <div className="space-y-3 text-sm bg-card p-4 rounded-lg shadow border border-border/10">
                        {/* ... (Rating, Status, Tags rendering) ... */}
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
            ) : (
                // Render skeleton again if novel becomes null after loading (edge case)
                <LeftColumnSkeleton />
            )}

            {/* Right Column - Description and Chapters */}
            {showSkeletons ? (
                <RightColumnSkeleton />
            ) : novel ? (
                 <div className="md:col-span-2 space-y-6">
                    {/* Title and Description Section */}
                    <div className="bg-card rounded-lg shadow p-6 border border-border/10">
                        {isEditingNovel ? (
                            // Edit Form for Novel Details
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="edit-novel-title" className="block text-sm font-medium mb-1 text-muted-foreground">Title</label>
                                    <Input id="edit-novel-title" type="text" value={editedNovelTitle} onChange={(e) => setEditedNovelTitle(e.target.value)} className="w-full" disabled={savingNovel} />
                                </div>
                                <div>
                                    <label htmlFor="edit-novel-desc" className="block text-sm font-medium mb-1 text-muted-foreground">Description</label>
                                    <Textarea id="edit-novel-desc" value={editedDescription} onChange={(e) => setEditedDescription(e.target.value)} rows={5} className="w-full" disabled={savingNovel} />
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <Button variant="ghost" onClick={handleCancelEditNovel} disabled={savingNovel}>Cancel</Button>
                                    <Button onClick={handleSaveNovelDetails} disabled={savingNovel || !editedNovelTitle.trim()}>
                                        {savingNovel ? <LoadingSpinner className="mr-2" size="sm"/> : null}
                                        {savingNovel ? 'Saving...' : 'Save Changes'}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            // Display Novel Details
                            <div>
                                <div className="flex justify-between items-start mb-2">
                                    <h1 className="text-2xl md:text-3xl font-bold text-foreground">{novel.title}</h1>
                                    {/* Show Edit button only if isAuthor is true (checked after auth loaded) */}
                                    {isAuthor && (
                                        <Button variant="ghost" size="icon" onClick={handleStartEditNovel} className="text-muted-foreground hover:text-foreground" aria-label="Edit novel title and description" disabled={isAnyChapterOperationInProgress || savingNovel}>
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
                            {/* Show Chapter actions only if isAuthor is true */}
                            {isAuthor && (
                                <div className="flex items-center gap-2 flex-wrap">
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
                            <AddChapterModal
                                novelId={novelId}
                                currentChapters={chapters ?? []}
                                onClose={() => setShowAddChapter(false)}
                                onSuccess={handleChapterAdded}
                            />
                        )}

                        <div className="space-y-1">
                            {/* Show skeleton if chapters are loading */}
                            {chapters === null ? (
                                <ChaptersSkeleton />
                            ) : chapters.length > 0 ? (
                                [...chapters] // Ensure sorting happens on a copy
                                    .sort((a, b) => a.chapter_number - b.chapter_number)
                                    .map((chapter) => (
                                    <ChapterTitleEditor
                                        key={chapter.id}
                                        chapter={chapter}
                                        novelId={novelId!}
                                        isAuthor={isAuthor} // Pass determined author status
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
                                        disabled={savingNovel} // Disable edits during novel save
                                    />
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground italic p-2">No chapters added yet.</p>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                 // Render skeleton again if novel becomes null after loading (edge case)
                 <RightColumnSkeleton />
            )}
          </div>
      </div>
    </div>
  );
}