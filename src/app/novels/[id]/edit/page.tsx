// src/app/novels/[id]/edit/page.tsx (Novel Edit + Chapter Management)
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, X, Save, UploadCloud, BookOpen, Edit, Lock, Unlock, Trash2, Plus, ArrowDownUp, Search } from 'lucide-react'; // Added needed icons
import { useAuth } from '@/providers/auth-provider';
import AdminRoleCheck from '@/components/auth/admin-role-check';
// Import chapter-related API functions
import { getNovel, getNovelChapters, updateNovelDetails, addChapter, deleteChapter, updateChapter, updateAllChaptersLockStatus } from '@/lib/api';
import type { Novel, ChapterType } from '@/types/supabase';
import { ImageUpload } from '@/components/ui/image-upload';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/ui/loading-spinner';
import NotFoundScreen from '@/components/ui/not-found-screen';
import AddChapterModal from '@/components/add-chapter-modal'; // Import AddChapterModal
import ChapterTitleEditor from '@/components/chapter-title-editor'; // Import ChapterTitleEditor
import { cn } from '@/lib/utils'; // Ensure cn is imported

// Skeleton for chapters list within edit page
function EditChaptersSkeleton() {
    return (
        <div className="space-y-1 animate-pulse">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-md h-10 bg-muted/50"></div>
            ))}
        </div>
    );
}

export default function EditNovelAndChaptersPage() {
    const { user, role, loading: authLoading } = useAuth();
    const params = useParams();
    const router = useRouter();
    const novelId = Number(params.id);

    const [novel, setNovel] = useState<Novel | null>(null);
    const [chapters, setChapters] = useState<ChapterType[] | null>(null); // State for chapters
    const [loading, setLoading] = useState(true);
    const [savingNovel, setSavingNovel] = useState(false); // Separate saving state for novel details
    const [error, setError] = useState<string | null>(null);

    // Form state for Novel Details
    const [editedTitle, setEditedTitle] = useState('');
    const [editedAuthor, setEditedAuthor] = useState('');
    const [editedDescription, setEditedDescription] = useState('');
    const [editedTags, setEditedTags] = useState('');
    const [editedStatus, setEditedStatus] = useState<'Ongoing' | 'Completed'>('Ongoing');
    const [editedCoverUrl, setEditedCoverUrl] = useState<string | null>(null);
    const [currentCoverUrl, setCurrentCoverUrl] = useState<string | null>(null);

    // State for Chapter Management moved here
    const [isEditingChapterId, setIsEditingChapterId] = useState<number | null>(null);
    const [showAddChapter, setShowAddChapter] = useState(false);
    const [chapterOperationStatus, setChapterOperationStatus] = useState<{ id: number | null; type: string | null; }>({ id: null, type: null });
    const [bulkLockLoading, setBulkLockLoading] = useState(false);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [chapterSearchTerm, setChapterSearchTerm] = useState('');

    // Combined fetch for novel and chapters
    const loadData = useCallback(async () => {
        if (isNaN(novelId) || authLoading) return;
        console.log(`[EditPage] Loading data for novel ${novelId}`);
        setLoading(true); setError(null);
        try {
            // Fetch concurrently
            const [novelData, chaptersData] = await Promise.all([
                getNovel(novelId),
                getNovelChapters(novelId)
            ]);

            if (!novelData) throw new Error('Novel not found.');

            setNovel(novelData);
            setChapters(chaptersData || []);

            // Set initial form state from novelData
            setEditedTitle(novelData.title);
            setEditedAuthor(novelData.author);
            setEditedDescription(novelData.description || '');
            setEditedTags(novelData.tags?.join(', ') || '');
            setEditedStatus(novelData.status);
            setCurrentCoverUrl(novelData.cover_url);
            setEditedCoverUrl(novelData.cover_url);

            console.log(`[EditPage] Data loaded. Chapters: ${chaptersData?.length ?? 0}`);

        } catch (err: any) {
            setError(err.message || 'Failed to load data.');
            toast.error(err.message || 'Failed to load data.');
        } finally {
            setLoading(false);
        }
    }, [novelId, authLoading]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // --- Handlers for Novel Details ---
    const handleSaveNovel = async () => {
        if (!novel || !editedTitle.trim() || !editedAuthor.trim()) { toast.warning("Title and Author cannot be empty."); return; }
        setSavingNovel(true); toast.info("Saving novel changes...");
        try {
            const updateData: Partial<Omit<Novel, 'id' | 'created_at' | 'updated_at' | 'rating' | 'author_id'>> = {
                title: editedTitle.trim(), author: editedAuthor.trim(), description: editedDescription.trim() || null,
                tags: editedTags.split(',').map(tag => tag.trim()).filter(tag => tag), status: editedStatus, cover_url: editedCoverUrl
            };
            const success = await updateNovelDetails(novel.id, updateData);
            if (success) { toast.success("Novel details saved!"); router.push(`/novels/${novel.id}`); router.refresh(); } // Go back to view page on success
            else { throw new Error("Server failed to save changes."); }
        } catch (err: any) { console.error("Error saving novel:", err); toast.error(err.message || "Failed to save novel details.");
        } finally { setSavingNovel(false); }
    };
    const handleCoverUploadComplete = (url: string) => { setEditedCoverUrl(url); setCurrentCoverUrl(url); toast.info("Cover image selected. Click 'Save Changes' to apply."); };
    const handleRemoveCover = () => { setEditedCoverUrl(null); setCurrentCoverUrl(null); toast.info("Cover image removed. Click 'Save Changes' to apply."); }

    // --- Handlers for Chapter Management (moved from view page) ---
    const handleStartEditChapter = (chapter: ChapterType) => setIsEditingChapterId(chapter.id);
    const handleCancelEditChapter = () => setIsEditingChapterId(null);
    const handleSaveChapterTitle = async (chapterId: number, newTitle: string): Promise<void> => {
        setChapterOperationStatus({ id: chapterId, type: 'savingTitle' });
        try {
            const success = await updateChapter(novelId!, chapterId, { title: newTitle });
            if (success) { toast.success("Chapter title saved."); setChapters(prev => prev ? prev.map(c => c.id === chapterId ? { ...c, title: newTitle } : c) : null); handleCancelEditChapter(); }
            else toast.error("Failed to save title.");
        } catch (e) { toast.error("Error saving title."); } finally { setChapterOperationStatus({ id: null, type: null }); }
    };
    const handleDeleteChapter = async (chapterId: number, chapterNumber: number): Promise<void> => {
        if (!confirm(`Delete Chapter ${chapterNumber}? This cannot be undone.`)) return;
        setChapterOperationStatus({ id: chapterId, type: 'deleting' });
        try {
            const success = await deleteChapter(novelId!, chapterId);
            if (success) { toast.success("Chapter deleted."); setChapters(prev => prev ? prev.filter(c => c.id !== chapterId) : null); } // Update local state
            else toast.error("Failed to delete chapter.");
        } catch (e) { toast.error("Error deleting chapter."); } finally { setChapterOperationStatus({ id: null, type: null }); }
    };
    const handleToggleChapterLock = async (chapterId: number, currentLockedStatus: boolean): Promise<void> => {
        setChapterOperationStatus({ id: chapterId, type: 'togglingLock' });
        try {
            const success = await updateChapter(novelId!, chapterId, { is_locked: !currentLockedStatus });
            if (success) { toast.success(`Chapter ${!currentLockedStatus ? 'locked' : 'unlocked'}.`); setChapters(prev => prev ? prev.map(c => c.id === chapterId ? { ...c, is_locked: !currentLockedStatus } : c) : null); }
            else toast.error("Failed to toggle lock status.");
        } catch (e) { toast.error("Error toggling lock."); } finally { setChapterOperationStatus({ id: null, type: null }); }
    };
    const handleChapterAdded = useCallback(async () => {
        // Refetch chapters after adding one
        console.log("[EditPage] Chapter added, refetching chapter list...");
        setChapters(null); // Indicate loading
        try {
            const chaptersData = await getNovelChapters(novelId);
            setChapters(chaptersData || []);
        } catch (err) {
            toast.error("Failed to refresh chapter list after adding.");
        }
    }, [novelId]);
    const handleBulkLockUnlock = async (lockStatus: boolean): Promise<void> => {
        setBulkLockLoading(true);
        try {
            const success = await updateAllChaptersLockStatus(novelId!, lockStatus);
            if (success) { toast.success(`All chapters ${lockStatus ? 'locked' : 'unlocked'}.`); setChapters(prev => prev ? prev.map(c => ({ ...c, is_locked: lockStatus })) : null); } // Update local state
            else toast.error(`Failed to ${lockStatus ? 'lock' : 'unlock'} all chapters.`);
        } catch (e) { toast.error("Error performing bulk action."); } finally { setBulkLockLoading(false); }
    };

    // Filtered/Sorted Chapters for Edit Page display
    const displayedChapters = useMemo(() => {
        if (!chapters) return [];
        const filtered = chapters.filter(chapter => {
            const searchTermLower = chapterSearchTerm.toLowerCase();
            return chapter.title.toLowerCase().includes(searchTermLower) || chapter.chapter_number.toString().includes(searchTermLower);
        });
        return [...filtered].sort((a, b) => sortOrder === 'asc' ? a.chapter_number - b.chapter_number : b.chapter_number - a.chapter_number);
    }, [chapters, chapterSearchTerm, sortOrder]);


    // Loading/Error States
     if (loading || authLoading) { return ( <div className="min-h-screen bg-background flex items-center justify-center"> <LoadingSpinner size="lg" /> <span className="ml-2 text-muted-foreground">Loading editor...</span> </div> ); }
     if (error) { return <NotFoundScreen message={error} returnUrl="/" returnText="Return to Home" />; }

    const isAnyChapterOperationInProgress = chapterOperationStatus.id !== null || bulkLockLoading;

    return (
      <AdminRoleCheck allowAuthor={true}>
        <div className="min-h-screen bg-background text-foreground">
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-3xl mx-auto space-y-8"> {/* Added space-y */}
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
            <Link href={`/novels/${novelId}`}>
                <ArrowLeft size={16} className="mr-1" />
                Back to Novel View
            </Link>
            </Button>
              {/* Novel Details Edit Form Card */}
              <div className="bg-card text-card-foreground rounded-lg shadow-lg p-6">
                <h1 className="text-2xl font-bold mb-6 text-foreground"> Edit Novel Details </h1>
                <div className="space-y-6">
                  {/* Cover Section */}
                  <div> {/* ... Cover upload/remove UI ... */} </div>
                  {/* Title */}
                  <div> <label htmlFor="novel-title">Title</label> <Input id="novel-title" value={editedTitle} onChange={e => setEditedTitle(e.target.value)} disabled={savingNovel} required /> </div>
                  {/* Author */}
                  <div> <label htmlFor="novel-author">Author</label> <Input id="novel-author" value={editedAuthor} onChange={e => setEditedAuthor(e.target.value)} disabled={savingNovel} required /> </div>
                  {/* Description */}
                  <div> <label htmlFor="novel-description">Description</label> <Textarea id="novel-description" rows={5} value={editedDescription} onChange={e => setEditedDescription(e.target.value)} disabled={savingNovel} /> </div>
                  {/* Tags */}
                  <div> <label htmlFor="novel-tags">Tags (comma separated)</label> <Input id="novel-tags" value={editedTags} onChange={e => setEditedTags(e.target.value)} placeholder="Fantasy, Action" disabled={savingNovel} /> </div>
                  {/* Status */}
                  <div> <label htmlFor="novel-status">Status</label> <select id="novel-status" value={editedStatus} onChange={e => setEditedStatus(e.target.value as any)} disabled={savingNovel} className="..."> <option value="Ongoing">Ongoing</option> <option value="Completed">Completed</option> </select> </div>
                  {/* Action Buttons for Novel Details */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-border"> <Button variant="ghost" onClick={() => router.push(`/novels/${novelId}`)} disabled={savingNovel}> Cancel </Button> <Button onClick={handleSaveNovel} disabled={savingNovel || !editedTitle.trim() || !editedAuthor.trim()}> {savingNovel ? <LoadingSpinner className="mr-2" size="sm"/> : <Save size={16} className="mr-1" />} {savingNovel ? 'Saving...' : 'Save Novel Details'} </Button> </div>
                </div>
              </div>

              {/* Chapter Management Section Card */}
              <div className="bg-card text-card-foreground rounded-lg shadow-lg p-6">
                  {/* Chapter Section Header with Sort/Filter */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                    <h2 className="text-xl font-semibold text-foreground flex-shrink-0">Manage Chapters</h2>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto sm:ml-auto">
                       {/* Search Input */}
                       <div className="relative flex-grow sm:flex-grow-0 sm:w-48"> <Input type="text" placeholder="Filter chapters..." value={chapterSearchTerm} onChange={(e) => setChapterSearchTerm(e.target.value)} className="h-9 pl-8 text-sm w-full" aria-label="Filter chapters by title or number"/> <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" /> </div>
                       {/* Sort Toggle Button */}
                       <Button variant="outline" size="sm" onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')} className="h-9 gap-1 w-full sm:w-auto flex-shrink-0" aria-label={`Sort chapters ${sortOrder === 'asc' ? 'descending by number' : 'ascending by number'}`} title={`Sort ${sortOrder === 'asc' ? 'Newest First' : 'Oldest First'}`}> <ArrowDownUp size={16} /> </Button>
                    </div>
                  </div>
                  {/* Admin Chapter Actions (Add/Lock All) */}
                   <div className="flex items-center gap-2 flex-wrap mb-4 border-b border-border pb-4">
                       <>
                         {chapters && chapters.length > 0 && (
                           <>
                             <Button onClick={() => handleBulkLockUnlock(true)} size="sm" variant="outline" className="gap-1 text-destructive border-destructive hover:bg-destructive/10" disabled={isAnyChapterOperationInProgress || savingNovel}> {bulkLockLoading ? <LoadingSpinner className="mr-1" size="sm"/> : <Lock size={16} className="mr-1" />} Lock All </Button>
                             <Button onClick={() => handleBulkLockUnlock(false)} size="sm" variant="outline" className="gap-1 text-green-600 border-green-600 hover:bg-green-500/10" disabled={isAnyChapterOperationInProgress || savingNovel}> {bulkLockLoading ? <LoadingSpinner className="mr-1" size="sm"/> : <Unlock size={16} className="mr-1" />} Unlock All </Button>
                           </>
                         )}
                         <Button onClick={() => setShowAddChapter(true)} size="sm" variant="outline" disabled={isAnyChapterOperationInProgress || savingNovel}> <Plus size={16} className="mr-1" /> Add Chapter </Button>
                       </>
                   </div>
                  {/* Add Chapter Modal - Rendered here, props passed correctly */}
                  {showAddChapter && chapters !== null && novelId !== null && (
                      <AddChapterModal
                          novelId={novelId}
                          currentChapters={chapters ?? []} // Pass current chapters state
                          onClose={() => setShowAddChapter(false)}
                          onSuccess={handleChapterAdded} // Use handler to refetch chapters
                      />
                  )}
                  {/* Chapter List with Editor */}
                  <div className="space-y-1">
                     {chapters === null && loading ? ( // Use main loading state for initial chapter load
                         <EditChaptersSkeleton />
                     ) : displayedChapters.length > 0 ? (
                         displayedChapters.map((chapter) => (
                            <ChapterTitleEditor
                                key={chapter.id} chapter={chapter} novelId={novelId!} isAuthor={true} // Always author on edit page
                                isEditing={isEditingChapterId === chapter.id}
                                onStartEdit={handleStartEditChapter} onCancelEdit={handleCancelEditChapter}
                                onSaveTitle={handleSaveChapterTitle} onToggleLock={handleToggleChapterLock}
                                onDeleteChapter={handleDeleteChapter}
                                savingTitle={chapterOperationStatus.id === chapter.id && chapterOperationStatus.type === 'savingTitle'}
                                deletingChapter={chapterOperationStatus.id === chapter.id && chapterOperationStatus.type === 'deleting'}
                                togglingLock={chapterOperationStatus.id === chapter.id && chapterOperationStatus.type === 'togglingLock'}
                                bulkOperationInProgress={bulkLockLoading}
                                disabled={savingNovel} // Disable chapter ops while saving novel details
                            />
                         ))
                     ) : (
                         <p className="text-sm text-muted-foreground italic p-2"> {chapterSearchTerm ? 'No chapters match your filter.' : (chapters === null ? 'Loading chapters...' : 'No chapters added yet.')} </p>
                     )}
                  </div>
              </div> {/* End Chapters Card */}
            </div> {/* End Page Max Width */}
          </div> {/* End Container */}
        </div> {/* End Main Div */}
      </AdminRoleCheck>
    );
}