// src/app/novels/[id]/chapter/[chapterId]/edit/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
// Use Novel and ChapterType directly
import type { ChapterType, Novel } from '@/types/supabase';
import { useAuth } from '@/providers/auth-provider';
// Fetch novel metadata only
import { getChapter, getNovel, updateChapter } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import LoadingScreen from '@/components/ui/loading-screen';
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

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [chapter, setChapterState] = useState<ChapterType | null>(null);
  // *** FIX: State type is now Novel | null ***
  const [novel, setNovel] = useState<Novel | null>(null);

  // useChapterActions hook usage remains the same, but the 'novel' prop passed
  // might be implicitly handled if the hook doesn't strictly require NovelType internally.
  // We might need to adjust the hook later if it causes issues, but let's fix the page first.
  const {
      isAuthor,
      editedTitle,
      setEditedTitle,
      editedContent,
      setEditedContent,
      isLocked,
      setIsLocked,
      saving,
      setSaving,
      // handleSave: hookHandleSave // Can remove this if not needed directly here
  } = useChapterActions(chapter, user, role, setChapterState, novel ?? undefined);


  // --- Fetch Data ---
  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    if (isNaN(novelId) || isNaN(chapterNumber)) {
      setLoadError('Invalid novel or chapter ID.');
      setLoading(false);
      toast.error('Invalid URL parameters.');
      router.push('/');
      return;
    }
    try {
      // Fetch chapter and novel metadata concurrently
      const [fetchedChapter, fetchedNovel] = await Promise.all([
         getChapter(novelId, chapterNumber),
         getNovel(novelId) // Fetches Novel metadata only
      ]);

      if (!fetchedNovel) throw new Error('Novel not found');
      if (!fetchedChapter) throw new Error('Chapter not found');

      setNovel(fetchedNovel); // Set Novel state
      setChapterState(fetchedChapter); // Set Chapter state

    } catch (error: any) {
      console.error('Error loading chapter data for edit:', error);
      const message = error.message || 'Failed to load chapter data.';
      setLoadError(message);
      toast.error(`Error: ${message}`);
      if (message.includes('not found')) {
        // Redirect to novel page if novel/chapter not found
        router.push(`/novels/${novelId || ''}`);
      }
    } finally {
      setLoading(false);
    }
  }, [novelId, chapterNumber, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Save Action
  const handleSave = async (): Promise<boolean> => {
    // Check permissions and required data
    // novel?.id is used here which comes from the Novel state
    if (!user || role !== 'admin' || !chapter || !novel?.id) {
      toast.error("Cannot save: Insufficient permissions or missing data.");
      return false;
    }

    setSaving(true);
    toast.info('Saving chapter...');
    try {
      // Pass novel.id from the fetched Novel metadata
      const success = await updateChapter(novel.id, chapter.id, {
          title: editedTitle.trim(),
          content: editedContent,
          is_locked: isLocked,
          // 'newly_created' likely shouldn't be part of standard updates unless specifically needed
          // newly_created: false
      });

      if (success) {
           setChapterState(prev => prev ? {
               ...prev,
               title: editedTitle.trim(),
               content: editedContent,
               is_locked: isLocked,
               updated_at: new Date().toISOString()
           } : null);
           toast.success('Chapter saved successfully');

           const autosaveKey = `chapter_draft_${novelId}_${chapter?.id ?? 'new'}`;
           localStorage.removeItem(autosaveKey);

           // Redirect to reading page on success
           router.push(`/novels/${novelId}/chapter/${chapterNumber}`);

      } else {
           toast.error('Failed to save chapter. Please try again.');
      }
      return success;
    } catch (error) {
      console.error('Error saving chapter:', error);
      toast.error('Failed to save chapter. Please check console for details.');
      return false;
    } finally {
      // Set saving to false if not redirecting (though redirect should happen on success)
      setSaving(false);
    }
  };

  // Handle Cancel Action
  const handleCancel = () => {
    const hasChanges = editedTitle !== chapter?.title ||
                       editedContent !== (chapter?.content || '') ||
                       isLocked !== chapter?.is_locked;

    if (hasChanges) {
      const discard = confirm("You have unsaved changes in this draft. Discard draft?");
      if (!discard) return;
    }
    const autosaveKey = `chapter_draft_${novelId}_${chapter?.id ?? 'new'}`;
    localStorage.removeItem(autosaveKey);

    router.push(`/novels/${novelId}/chapter/${chapterNumber}`);
  };

  // --- Loading and Error Handling ---
  if (loading || authLoading) {
    return <LoadingScreen message="Loading chapter editor..." />;
  }
  if (loadError?.includes("Invalid Novel ID")) {
      return <NotFoundScreen message={loadError} returnUrl="/" returnText="Return to Home" />;
  }
  // Check chapter as well
  if (loadError || !novel || !chapter) {
    return <NotFoundScreen message={loadError || "Chapter or Novel data missing."} returnUrl={`/novels/${novelId || ''}`} returnText="Back to Novel"/>;
  }

  // Render the editor component
  return (
    <AdminRoleCheck allowAuthor={true}>
      {/* Ensure ChapterFullEditor receives the chapter data correctly */}
      <ChapterFullEditor
          chapter={chapter} // Pass the loaded chapter
          isAuthor={isAuthor}
          editedTitle={editedTitle}
          setEditedTitle={setEditedTitle}
          editedContent={editedContent}
          setEditedContent={setEditedContent}
          isLocked={isLocked}
          setIsLocked={setIsLocked}
          saving={saving}
          setSaving={setSaving}
          onSave={handleSave}
          onCancel={handleCancel}
      />
    </AdminRoleCheck>
  );
};

export default EditChapterPage;