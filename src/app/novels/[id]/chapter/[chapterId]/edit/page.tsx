// src/app/novels/[id]/chapter/[chapterId]/edit/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation'; // Ensure useRouter is imported
import { toast } from 'sonner';
import type { ChapterType, NovelType } from '@/types/supabase';
import { useAuth } from '@/providers/auth-provider';
import { getChapter, getNovel, updateChapter } from '@/lib/api'; // Import updateChapter
import { supabase } from '@/lib/supabase';
import LoadingScreen from '@/components/ui/loading-screen';
import NotFoundScreen from '@/components/ui/not-found-screen';
import AdminRoleCheck from '@/components/auth/admin-role-check';
import ChapterFullEditor from '@/components/chapter-full-editor';
import { useChapterActions } from '@/hooks/use-chapter-actions';

const EditChapterPage = () => {
  const { user, role, loading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter(); // Ensure router is initialized
  const novelId = Number(params.id);
  const chapterNumber = Number(params.chapterId);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [chapter, setChapterState] = useState<ChapterType | null>(null);
  const [novel, setNovel] = useState<NovelType | null>(null);

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
      handleSave: hookHandleSave // Renamed to avoid conflict if needed, though not strictly necessary here
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
      const [fetchedChapter, fetchedNovel] = await
        Promise.all([
          getChapter(novelId, chapterNumber),
          getNovel(novelId)
      ]);
      if (!fetchedNovel) throw new Error('Novel not found');
      if (!fetchedChapter) throw new Error('Chapter not found');
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
      setLoading(false);
    }
  }, [novelId, chapterNumber, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Save Action
  const handleSave = async (): Promise<boolean> => {
    if (!user || role !== 'admin' || !chapter || !novel) {
      toast.error("Cannot save: Insufficient permissions or missing data.");
      return false;
    }

    setSaving(true);
    toast.info('Saving chapter...');
    try {
      const success = await updateChapter(novel.id, chapter.id, {
          title: editedTitle.trim(),
          content: editedContent,
          is_locked: isLocked,
          newly_created: false
      });

      if (success) {
           // Update local state (optional, as we are redirecting)
           setChapterState(prev => prev ? {
               ...prev,
               title: editedTitle.trim(),
               content: editedContent,
               is_locked: isLocked,
               newly_created: false,
               updated_at: new Date().toISOString()
           } : null);
           toast.success('Chapter saved successfully');

           // Clear autosave draft on successful save
           const autosaveKey = `chapter_draft_${novelId}_${chapter?.id ?? 'new'}`;
           localStorage.removeItem(autosaveKey);

           // *** REDIRECT TO READING PAGE ON SUCCESS ***
           router.push(`/novels/${novelId}/chapter/${chapterNumber}`);
           // ******************************************

      } else {
           toast.error('Failed to save chapter. Please try again.');
      }
      return success; // Return success status
    } catch (error) {
      console.error('Error saving chapter:', error);
      toast.error('Failed to save chapter. Please check console for details.');
      return false; // Return failure status
    } finally {
      // Only set saving to false if we are *not* redirecting immediately
      // If redirection happens, the component unmounts, so setting state is less critical.
      // However, it's good practice in case the redirect fails for some reason.
      // We might keep this, or remove it depending on desired behavior if redirect fails.
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
    // Clear autosave draft on cancel
    const autosaveKey = `chapter_draft_${novelId}_${chapter?.id ?? 'new'}`;
    localStorage.removeItem(autosaveKey);

    router.push(`/novels/${novelId}/chapter/${chapterNumber}`); // Navigate back to reading page
  };

  // --- Loading and Error Handling ---
  if (loading || authLoading) {
    return <LoadingScreen message="Loading chapter editor..." />;
  }
  if (loadError?.includes("Invalid Novel ID")) {
      return <NotFoundScreen message={loadError} returnUrl="/" returnText="Return to Home" />;
  }
  if (loadError || !novel || !chapter) {
    return <NotFoundScreen message={loadError || "Chapter or Novel data missing."} returnUrl={`/novels/${novelId || ''}`} returnText="Back to Novel"/>;
  }

  // Render the editor component
  return (
    <AdminRoleCheck allowAuthor={true}> {/* Ensure this page is protected */}
      <ChapterFullEditor
          chapter={chapter}
          isAuthor={isAuthor}
          editedTitle={editedTitle}
          setEditedTitle={setEditedTitle}
          editedContent={editedContent}
          setEditedContent={setEditedContent}
          isLocked={isLocked}
          setIsLocked={setIsLocked}
          saving={saving}
          setSaving={setSaving}
          onSave={handleSave} // Pass the updated save handler
          onCancel={handleCancel}
      />
    </AdminRoleCheck>
  );
};

export default EditChapterPage;