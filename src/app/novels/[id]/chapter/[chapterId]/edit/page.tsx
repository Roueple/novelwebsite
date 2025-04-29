// src/app/novels/[id]/chapter/[chapterId]/edit/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react'; // Removed useRef as it's not used directly here now
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { ChapterType, Novel } from '@/types/supabase';
import { useAuth } from '@/providers/auth-provider';
import { getChapter, getNovel, updateChapter } from '@/lib/api';
// import { supabase } from '@/lib/supabase'; // Keep if other direct calls are needed
// import LoadingScreen from '@/components/ui/loading-screen'; // REMOVED
import LoadingSpinner from '@/components/ui/loading-spinner'; // IMPORTED
import NotFoundScreen from '@/components/ui/not-found-screen';
import AdminRoleCheck from '@/components/auth/admin-role-check';
import ChapterFullEditor from '@/components/chapter-full-editor';
import { useChapterActions } from '@/hooks/use-chapter-actions';

const EditChapterPage = () => {
  const { user, role, loading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const novelId = Number(params.id);
  const chapterNumber = Number(params.chapterId);

  const [dataLoading, setDataLoading] = useState(true); // Combined loading state
  const [loadError, setLoadError] = useState<string | null>(null);
  const [chapter, setChapterState] = useState<ChapterType | null>(null);
  const [novel, setNovel] = useState<Novel | null>(null);

  // useChapterActions hook manages editor-specific state based on the fetched chapter
  const {
      isAuthor, // Recalculated based on passed user/role
      editedTitle, setEditedTitle,
      editedContent, setEditedContent,
      isLocked, setIsLocked,
      saving, setSaving, // Saving state is now managed via hook prop
  } = useChapterActions(chapter, user, role, setChapterState, novel ?? undefined);

  // --- Fetch Initial Data ---
  const loadData = useCallback(async () => {
    // Wait for auth check to complete - IMPORTANT
    if (authLoading) {
        console.log("[EditChapterPage] Waiting for auth loading...");
        // Keep dataLoading true while auth is loading
        if (!dataLoading) setDataLoading(true);
        return;
    }
     // If auth is loaded but no user/admin role, AdminRoleCheck will handle redirection
     // We can proceed assuming AdminRoleCheck allows continuation

    console.log("[EditChapterPage] Auth loaded, proceeding to fetch data.");
    setDataLoading(true); // Ensure loading state is true during fetch
    setLoadError(null);

    if (isNaN(novelId) || isNaN(chapterNumber)) {
      setLoadError('Invalid novel or chapter ID.');
      setDataLoading(false);
      toast.error('Invalid URL parameters.');
      router.push('/'); // Redirect on invalid ID
      return;
    }

    try {
      const userId = user?.id ?? null; // Pass user ID for potential authorization checks in getChapter
      console.log(`[EditChapterPage] Fetching data with userId: ${userId}`);

      const [fetchedChapter, fetchedNovel] = await Promise.all([
        getChapter(novelId, chapterNumber, userId), // API needs to handle auth for content
        getNovel(novelId) // Fetch novel metadata
      ]);

      if (!fetchedNovel) throw new Error('Novel not found');
      // Chapter MUST exist to edit, and user MUST be authorized (handled by AdminRoleCheck + API potentially)
      if (!fetchedChapter) throw new Error('Chapter not found or unauthorized.');
      // Check if content is null but shouldn't be (e.g., locked but user is admin) - this indicates potential API issue
      if (fetchedChapter.content === null && (role === 'admin')) {
           console.warn(`[EditChapterPage] Chapter content is null for chapter ${fetchedChapter.id} despite admin role. Check API logic.`);
           // Decide how to handle: show error, or allow editing empty content?
           // For now, allow editing potentially empty content if authorized.
      }

      setNovel(fetchedNovel);
      setChapterState(fetchedChapter); // Set chapter, hook will sync editor state

    } catch (error: any) {
      console.error('Error loading chapter data for edit:', error);
      const message = error.message || 'Failed to load chapter data.';
      setLoadError(message);
      toast.error(`Error: ${message}`);
      // Redirect only if not found, otherwise show error within page structure
      if (message.includes('not found')) {
        router.push(`/novels/${novelId || ''}`);
      }
    } finally {
      setDataLoading(false); // Fetch attempt finished
    }
  }, [novelId, chapterNumber, router, authLoading, user, role]); // Include role

  // Load data on mount or when dependencies change
  useEffect(() => {
    loadData();
  }, [loadData]);

  // --- Handle Save Action ---
  const handleSave = async (): Promise<boolean> => {
    if (!isAuthor || !chapter || !novel?.id) {
      toast.error("Cannot save: Insufficient permissions or missing data.");
      return false;
    }
    if (!editedTitle.trim()) {
        toast.warning("Chapter title cannot be empty.");
        return false;
    }

    setSaving(true); // Use setter from hook
    toast.info('Saving chapter...');
    let success = false;
    try {
      success = await updateChapter(novel.id, chapter.id, {
          title: editedTitle.trim(),
          content: editedContent,
          is_locked: isLocked,
      });

      if (success) {
        toast.success('Chapter saved successfully');
        const autosaveKey = `chapter_draft_${novelId}_${chapter?.id ?? 'new'}`;
        localStorage.removeItem(autosaveKey); // Clear draft on successful save
        router.push(`/novels/${novelId}/chapter/${chapterNumber}`); // Redirect after save
      } else {
        toast.error('Failed to save chapter. The server reported an issue.');
      }
    } catch (error) {
      console.error('Error saving chapter:', error);
      toast.error('An error occurred while saving the chapter.');
      success = false;
    } finally {
      setSaving(false); // Use setter from hook
    }
    return success;
  };

  // --- Handle Cancel Action ---
  const handleCancel = () => {
    // Check for unsaved changes compared to the *original* chapter state
    const hasChanges = editedTitle !== chapter?.title ||
                       editedContent !== (chapter?.content || '') ||
                       isLocked !== chapter?.is_locked;

    if (hasChanges) {
      const discard = confirm("You have unsaved changes. Are you sure you want to discard them?");
      if (!discard) return;
    }
    const autosaveKey = `chapter_draft_${novelId}_${chapter?.id ?? 'new'}`;
    localStorage.removeItem(autosaveKey); // Clear draft on cancel
    router.push(`/novels/${novelId}/chapter/${chapterNumber}`); // Redirect back
  };

  // --- Loading and Error Handling ---

  // Render error screen if a load error occurred (and not loading)
  if (!dataLoading && !authLoading && loadError) {
       // Check if the error indicates chapter/novel not found specifically
       if (loadError.includes('not found') || loadError.includes('Invalid novel or chapter ID')) {
           return <NotFoundScreen message={loadError} returnUrl={`/novels/${novelId || ''}`} returnText="Back to Novel"/>;
       } else {
           // Generic error display within the page structure might be better for non-404 errors
            return (
                <AdminRoleCheck allowAuthor={true}>
                    <div className="container mx-auto px-4 py-8 text-center">
                        <h1 className="text-xl text-destructive mb-4">Error Loading Editor</h1>
                        <p className="text-muted-foreground mb-6">{loadError}</p>
                        <Button onClick={() => router.push(`/novels/${novelId || ''}`)}>Back to Novel</Button>
                    </div>
                </AdminRoleCheck>
            );
       }
  }

  // --- Render Editor ---
  return (
    // AdminRoleCheck handles redirection if not authorized BEFORE data loading starts effectively
    <AdminRoleCheck allowAuthor={true}>
        {/* Show Loading Spinner centrally while waiting for auth or data */}
        {(authLoading || dataLoading) ? (
             <div className="flex items-center justify-center min-h-[calc(100vh-150px)]"> {/* Adjust height as needed */}
                <div className="flex flex-col items-center space-y-3">
                    <LoadingSpinner size="lg" />
                    <p className="text-muted-foreground">
                        {authLoading ? "Verifying authorization..." : "Loading chapter data..."}
                    </p>
                </div>
            </div>
        ) : chapter && novel ? ( // Render editor only when data is ready and no error occurred
            <ChapterFullEditor
                chapter={chapter}
                isAuthor={isAuthor}
                editedTitle={editedTitle} setEditedTitle={setEditedTitle}
                editedContent={editedContent} setEditedContent={setEditedContent}
                isLocked={isLocked} setIsLocked={setIsLocked}
                saving={saving} setSaving={setSaving}
                onSave={handleSave}
                onCancel={handleCancel}
            />
        ) : (
            // This state should ideally not be reached if error handling is correct,
            // but provides a fallback if data is missing without an error state.
             <div className="container mx-auto px-4 py-8 text-center">
                 <p className="text-muted-foreground">Could not load editor components.</p>
             </div>
        )}
    </AdminRoleCheck>
  );
};

export default EditChapterPage;