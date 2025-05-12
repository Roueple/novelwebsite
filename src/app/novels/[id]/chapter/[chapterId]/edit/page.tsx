// src/app/novels/[id]/chapter/[chapterId]/edit/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { Chapter, Novel } from '@/types';
import { useAuth } from '@/providers/auth-provider';
import { getChapter, getNovel, updateChapter } from '@/lib/api';
import LoadingSpinner from '@/components/ui/loading-spinner';
import NotFoundScreen from '@/components/ui/not-found-screen';
import AdminRoleCheck from '@/components/auth/admin-role-check';
import ChapterFullEditor from '@/components/chapter-full-editor';
import { useChapterActions } from '@/hooks/use-chapter-actions';
import { Button } from '@/components/ui/button'; // <-- **ADDED MISSING IMPORT**

const EditChapterPage = () => {
  const { user, role, loading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const novelId = Number(params.id);
  const chapterNumber = Number(params.chapterId);

  const [dataLoading, setDataLoading] = useState(true); // Combined loading state
  const [loadError, setLoadError] = useState<string | null>(null);
  const [chapter, setChapterState] = useState<Chapter | null>(null);
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
        if (!dataLoading) setDataLoading(true);
        return;
    }

    console.log("[EditChapterPage] Auth loaded, proceeding to fetch data.");
    setDataLoading(true);
    setLoadError(null);

    if (isNaN(novelId) || isNaN(chapterNumber)) {
      setLoadError('Invalid novel or chapter ID.');
      setDataLoading(false);
      toast.error('Invalid URL parameters.');
      router.push('/'); // Redirect on invalid ID
      return;
    }

    try {
      const userId = user?.id ?? null;
      console.log(`[EditChapterPage] Fetching data with userId: ${userId}`);

      const [fetchedChapter, fetchedNovel] = await Promise.all([
        getChapter(novelId, chapterNumber, userId),
        getNovel(novelId)
      ]);

      if (!fetchedNovel) throw new Error('Novel not found');
      if (!fetchedChapter) throw new Error('Chapter not found or unauthorized.');
      if (fetchedChapter.content === null && (role === 'admin')) {
           console.warn(`[EditChapterPage] Chapter content is null for chapter ${fetchedChapter.id} despite admin role. Check API logic.`);
      }

      setNovel(fetchedNovel);
      setChapterState(fetchedChapter);

    } catch (error: any) {
      console.error('Error loading chapter data for edit:', error);
      const message = error.message || 'Failed to load chapter data.';
      setLoadError(message);
      toast.error(`Error: ${message}`);
      if (message.includes('not found')) {
        router.push(`/novels/${novelId || ''}`);
      }
    } finally {
      setDataLoading(false);
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

    setSaving(true);
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
        localStorage.removeItem(autosaveKey);
        router.push(`/novels/${novelId}/chapter/${chapterNumber}`);
      } else {
        toast.error('Failed to save chapter. The server reported an issue.');
      }
    } catch (error) {
      console.error('Error saving chapter:', error);
      toast.error('An error occurred while saving the chapter.');
      success = false;
    } finally {
      setSaving(false);
    }
    return success;
  };

  // --- Handle Cancel Action ---
  const handleCancel = () => {
    const hasChanges = editedTitle !== chapter?.title ||
                       editedContent !== (chapter?.content || '') ||
                       isLocked !== chapter?.is_locked;
    if (hasChanges) {
      const discard = confirm("You have unsaved changes. Are you sure you want to discard them?");
      if (!discard) return;
    }
    const autosaveKey = `chapter_draft_${novelId}_${chapter?.id ?? 'new'}`;
    localStorage.removeItem(autosaveKey);
    router.push(`/novels/${novelId}/chapter/${chapterNumber}`);
  };

  // --- Loading and Error Handling ---
  if (!dataLoading && !authLoading && loadError) {
       if (loadError.includes('not found') || loadError.includes('Invalid novel or chapter ID')) {
           return <NotFoundScreen message={loadError} returnUrl={`/novels/${novelId || ''}`} returnText="Back to Novel"/>;
       } else {
            return (
                <AdminRoleCheck allowAuthor={true}>
                    <div className="container mx-auto px-4 py-8 text-center">
                        <h1 className="text-xl text-destructive mb-4">Error Loading Editor</h1>
                        <p className="text-muted-foreground mb-6">{loadError}</p>
                        {/* Button is now imported and usable */}
                        <Button onClick={() => router.push(`/novels/${novelId || ''}`)}>Back to Novel</Button>
                    </div>
                </AdminRoleCheck>
            );
       }
  }

  // --- Render Editor ---
  return (
    <AdminRoleCheck allowAuthor={true}>
        {(authLoading || dataLoading) ? (
             <div className="flex items-center justify-center min-h-[calc(100vh-150px)]">
                <div className="flex flex-col items-center space-y-3">
                    <LoadingSpinner size="lg" />
                    <p className="text-muted-foreground">
                        {authLoading ? "Verifying authorization..." : "Loading chapter data..."}
                    </p>
                </div>
            </div>
        ) : chapter && novel ? (
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
             <div className="container mx-auto px-4 py-8 text-center">
                 <p className="text-muted-foreground">Could not load editor components. Required data might be missing.</p>
             </div>
        )}
    </AdminRoleCheck>
  );
};

export default EditChapterPage;