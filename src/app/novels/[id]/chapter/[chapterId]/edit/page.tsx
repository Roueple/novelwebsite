// src/app/novels/[id]/chapter/[chapterId]/edit/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react'; // <--- ADD useMemo HERE
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { Chapter, Novel } from '@/types'; // Ensure these align with your supabase.ts
import { useAuth } from '@/providers/auth-provider';
import { getChapter, getNovel, updateChapter } from '@/lib/api'; // Ensure API functions are correct
import LoadingSpinner from '@/components/ui/loading-spinner';
import NotFoundScreen from '@/components/ui/not-found-screen';
import AdminRoleCheck from '@/components/auth/admin-role-check';
import ChapterFullEditor from '@/components/chapter-full-editor'; // Your existing editor component
import { Button } from '@/components/ui/button'; // Assuming you have this

const EditChapterPage = () => {
  const { user, role, loading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();

  const novelIdParam = params.id;
  const chapterNumberParam = params.chapterId;

  const [dataLoading, setDataLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [novel, setNovel] = useState<Novel | null>(null);

  // State for editor, managed here directly or via a refined useChapterActions
  const [editedTitle, setEditedTitle] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [saving, setSaving] = useState(false);

  const novelId = useMemo(() => Number(novelIdParam), [novelIdParam]);
  const chapterNumber = useMemo(() => Number(chapterNumberParam), [chapterNumberParam]);

  const isAdmin = useMemo(() => user !== null && role === 'admin', [user, role]);

  // --- Fetch Initial Data ---
  const loadData = useCallback(async () => {
    if (authLoading) {
      console.log("[EditChapterPage] Waiting for auth loading...");
      if (!dataLoading) setDataLoading(true);
      return;
    }

    if (!isAdmin) {
        setLoadError('You are not authorized to edit this chapter.');
        setDataLoading(false);
        toast.error('Access Denied.');
        // router.push(`/novels/${novelId}`); // Or home
        return;
    }

    setDataLoading(true);
    setLoadError(null);

    if (isNaN(novelId) || novelId <= 0 || isNaN(chapterNumber) || chapterNumber <= 0) {
      setLoadError('Invalid novel or chapter identifier in URL.');
      setDataLoading(false);
      toast.error('Invalid URL parameters.');
      router.push('/');
      return;
    }

    try {
      console.log(`[EditChapterPage] Fetching data for Novel ID: ${novelId}, Chapter No: ${chapterNumber}`);
      const requestingUserId = user?.id ?? null;

      // Fetch novel and chapter data concurrently
      const [fetchedNovel, fetchedChapter] = await Promise.all([
        getNovel(novelId),
        getChapter(novelId, chapterNumber, requestingUserId) // getChapter now handles locked content for admin
      ]);

      if (!fetchedNovel) {
        throw new Error('Novel not found. It may have been deleted or the ID is incorrect.');
      }
      // For editing, the chapter must exist and content should be available (admin bypasses lock)
      if (!fetchedChapter || fetchedChapter.content === null) {
        throw new Error('Chapter not found, or content is inaccessible even for an admin. Please check chapter existence and API logic.');
      }

      setNovel(fetchedNovel);
      setChapter(fetchedChapter);
      // Initialize editor states
      setEditedTitle(fetchedChapter.title);
      setEditedContent(fetchedChapter.content || ''); // Ensure content is not null for editor
      setIsLocked(fetchedChapter.is_locked);

    } catch (error: any) {
      console.error('[EditChapterPage] Error loading data for edit:', error);
      const message = error.message || 'Failed to load chapter data for editing.';
      setLoadError(message);
      toast.error(message);
      if (message.includes('Novel not found') && novelId) {
        router.push(`/novels/${novelId}`);
      } else if (message.includes('Chapter not found') && novelId) {
         router.push(`/novels/${novelId}`);
      }
    } finally {
      setDataLoading(false);
    }
  }, [novelId, chapterNumber, router, authLoading, user, isAdmin]); // Added isAdmin

  useEffect(() => {
    loadData();
  }, [loadData]);


  // --- Handle Save Action ---
  const handleSave = async (): Promise<boolean> => {
    if (!isAdmin || !chapter || !novel) {
      toast.error("Cannot save: Insufficient permissions or critical data missing.");
      console.log('[Debug] Save cancelled: isAdmin:', isAdmin, 'chapter:', !!chapter, 'novel:', !!novel);
      return false;
    }
    if (!editedTitle.trim()) {
      toast.warning("Chapter title cannot be empty.");
      return false;
    }

    setSaving(true);
    toast.info('Saving chapter...');
    let success = false;

    const updatePayload: Partial<Pick<Chapter, 'title' | 'content' | 'is_locked'>> = {
      title: editedTitle.trim(),
      content: editedContent, // Can be empty string, or null if your DB/editor handles it
      is_locked: isLocked,
    };

    try {
      console.log('[Debug] Attempting to save chapter:', {
          chapterId: chapter.id,
          payload: updatePayload,
      });
      // Pass only chapterId and the update payload to the revised updateChapter
      success = await updateChapter(chapter.id, updatePayload);

      console.log('[Debug] updateChapter success status:', success);
      if (success) {
        toast.success('Chapter saved successfully!');
        // Clear autosave draft from localStorage
        const autosaveKey = `chapter_draft_${novel.id}_${chapter.id}`;
        localStorage.removeItem(autosaveKey);
        router.push(`/novels/${novel.id}/chapter/${chapter.chapter_number}`);
      } else {
        toast.error('Failed to save chapter. The server reported an issue or no changes were made.');
        console.log('[Debug] Server reported save issue or no changes detected by API.');
      }
    } catch (error: any) {
      console.error('Error saving chapter:', error);
      toast.error(`An error occurred while saving: ${error.message || 'Unknown error'}`);
      success = false;
    } finally {
      setSaving(false);
    }
    return success;
  };

  // --- Handle Cancel Action ---
  const handleCancel = () => {
    if (!chapter || !novel) {
        router.push('/'); // Fallback if data isn't loaded
        return;
    }
    const hasChanges = editedTitle !== chapter.title ||
                       editedContent !== (chapter.content || '') ||
                       isLocked !== chapter.is_locked;
    if (hasChanges) {
      const discard = confirm("You have unsaved changes. Are you sure you want to discard them?");
      if (!discard) return;
    }
    // Clear autosave draft from localStorage
    const autosaveKey = `chapter_draft_${novel.id}_${chapter.id}`;
    localStorage.removeItem(autosaveKey);
    router.push(`/novels/${novel.id}/chapter/${chapter.chapter_number}`);
  };

  // --- Loading and Error States ---
  if (authLoading || dataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-150px)]">
        <div className="flex flex-col items-center space-y-3">
          <LoadingSpinner size="lg" />
          <p className="text-muted-foreground">
            {authLoading ? "Verifying authorization..." : "Loading chapter data..."}
          </p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return <NotFoundScreen message={loadError} returnUrl={novelId ? `/novels/${novelId}` : '/'} returnText="Back to Novel"/>;
  }

  if (!isAdmin) { // Should be caught by AdminRoleCheck or loadData, but as a fallback
      return <NotFoundScreen message="Access Denied. You do not have permission to edit this content." returnUrl="/" />;
  }

  if (!chapter || !novel) { // If data still isn't there after loading states
    return <NotFoundScreen message="Could not load chapter or novel data. Please try again." returnUrl="/" />;
  }

  // --- Render Editor ---
  return (
    // AdminRoleCheck ensures only admins can even reach this point.
    // You could wrap the content below with it, or rely on it at the layout/route level.
    // For this page, direct check `if (!isAdmin)` above is also effective.
    <AdminRoleCheck allowAuthor={true}> 
      {chapter && novel ? (
        <ChapterFullEditor
          chapter={chapter} // Pass the initial, fetched chapter
          isAuthor={isAdmin} // This will be true if we reach here
          // Pass state and setters for the editor to manage
          editedTitle={editedTitle}
          setEditedTitle={setEditedTitle}
          editedContent={editedContent}
          setEditedContent={setEditedContent}
          isLocked={isLocked}
          setIsLocked={setIsLocked}
          saving={saving}
          setSaving={setSaving} // Allow ChapterFullEditor to update saving state if needed (e.g. for its internal UI)
          onSave={handleSave}
          onCancel={handleCancel}
        />
      ) : (
        // This case should ideally be covered by loading/error states above
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-muted-foreground">Preparing editor...</p>
          <LoadingSpinner />
        </div>
      )}
    </AdminRoleCheck>
  );
};

export default EditChapterPage;