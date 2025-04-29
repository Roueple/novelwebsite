// src/app/novels/[id]/chapter/[chapterId]/edit/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { ChapterType, Novel } from '@/types/supabase'; // Use Novel and ChapterType directly
import { useAuth } from '@/providers/auth-provider';
import { getChapter, getNovel, updateChapter } from '@/lib/api'; // Fetch novel metadata only
import { supabase } from '@/lib/supabase'; // Keep if needed for other operations
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

  const [loading, setLoading] = useState(true); // Page loading state
  const [loadError, setLoadError] = useState<string | null>(null); // Error state
  const [chapter, setChapterState] = useState<ChapterType | null>(null); // Chapter data state
  const [novel, setNovel] = useState<Novel | null>(null); // Novel metadata state

  // useChapterActions hook manages editor-specific state based on the fetched chapter
  const {
      isAuthor, // Note: This hook recalculates isAuthor based on passed user/role
      editedTitle,
      setEditedTitle,
      editedContent,
      setEditedContent,
      isLocked,
      setIsLocked,
      saving,
      setSaving,
  } = useChapterActions(chapter, user, role, setChapterState, novel ?? undefined);

  // --- Fetch Initial Data ---
  const loadData = useCallback(async () => {
     // Wait for auth check to complete
    if (authLoading) {
        console.log("[EditChapterPage] Waiting for auth loading...");
        return;
    }

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
      // --- FIX: Pass user ID to getChapter ---
      const userId = user?.id ?? null;
      console.log(`[EditChapterPage] Fetching data with userId: ${userId}`);
      // Fetch chapter and novel metadata concurrently
      const [fetchedChapter, fetchedNovel] = await Promise.all([
         // Pass userId here, as editor needs full content if authorized
         getChapter(novelId, chapterNumber, userId),
         getNovel(novelId) // Still useful to fetch novel metadata (e.g., title)
      ]);
      // --- End FIX ---

      // Validate fetched data
      if (!fetchedNovel) throw new Error('Novel not found');
      if (!fetchedChapter) throw new Error('Chapter not found or unauthorized to edit'); // Modify error if content is null
      // If locked and content is null (and user isn't admin), they shouldn't be on the edit page
      if (fetchedChapter.is_locked && fetchedChapter.content === null && role !== 'admin') {
           toast.error("You are not authorized to edit this locked chapter.");
           router.push(`/novels/${novelId}/chapter/${chapterNumber}`); // Redirect to reading page
           return;
      }


      setNovel(fetchedNovel); // Set Novel state
      setChapterState(fetchedChapter); // Set Chapter state (hook will update editor state)

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
  // Depend on auth state as well
  }, [novelId, chapterNumber, router, authLoading, user, role]); // Add role dependency

  // Load data on mount or when dependencies change
  useEffect(() => {
    loadData();
  }, [loadData]);

  // --- Handle Save Action ---
  const handleSave = async (): Promise<boolean> => {
    // Check permissions and required data
    // isAuthor check here is redundant if AdminRoleCheck is used, but good safety measure
    if (!isAuthor || !chapter || !novel?.id) {
      toast.error("Cannot save: Insufficient permissions or missing data.");
      return false;
    }

    setSaving(true); // Use setter from hook
    toast.info('Saving chapter...');
    let success = false;
    try {
      // Call the API update function
      success = await updateChapter(novel.id, chapter.id, {
          title: editedTitle.trim(),
          content: editedContent, // Send the edited content
          is_locked: isLocked,
          // 'newly_created' likely shouldn't be part of standard updates
          // newly_created: false // Remove or handle appropriately if needed
      });

      if (success) {
           // Optionally update local state if not immediately redirecting
           // setChapterState(prev => prev ? { ... } : null);
           toast.success('Chapter saved successfully');
           // Clear the autosave draft on successful save
           const autosaveKey = `chapter_draft_${novelId}_${chapter?.id ?? 'new'}`;
           localStorage.removeItem(autosaveKey);
           // Redirect back to the reading page after save
           router.push(`/novels/${novelId}/chapter/${chapterNumber}`);
      } else {
           toast.error('Failed to save chapter. The server reported an issue.');
      }
    } catch (error) {
      console.error('Error saving chapter:', error);
      toast.error('An error occurred while saving the chapter. Please check console for details.');
      success = false; // Ensure success is false on catch
    } finally {
      setSaving(false); // Use setter from hook
    }
    return success; // Return success status
  };

  // --- Handle Cancel Action ---
  const handleCancel = () => {
    // Check if there are unsaved changes compared to the *original* chapter state
    const hasChanges = editedTitle !== chapter?.title ||
                       editedContent !== (chapter?.content || '') || // Compare with original content
                       isLocked !== chapter?.is_locked;

    if (hasChanges) {
      const discard = confirm("You have unsaved changes. Are you sure you want to discard them and return to the reading page?");
      if (!discard) return; // Keep editing if user cancels discard
    }

    // Clear the autosave draft on cancel
    const autosaveKey = `chapter_draft_${novelId}_${chapter?.id ?? 'new'}`;
    localStorage.removeItem(autosaveKey);

    // Redirect back to the reading page
    router.push(`/novels/${novelId}/chapter/${chapterNumber}`);
  };

  // --- Loading and Error Handling ---
  if (loading || authLoading) {
    return <LoadingScreen message="Loading chapter editor..." />;
  }
  if (loadError?.includes("Invalid Novel ID")) {
      return <NotFoundScreen message={loadError} returnUrl="/" returnText="Return to Home" />;
  }
  // Check chapter as well - ensures data is loaded before rendering editor
  if (loadError || !novel || !chapter) {
    return <NotFoundScreen message={loadError || "Chapter or Novel data missing."} returnUrl={`/novels/${novelId || ''}`} returnText="Back to Novel"/>;
  }

  // --- Render Editor ---
  // Use AdminRoleCheck to ensure only admins can access the edit page
  return (
    <AdminRoleCheck allowAuthor={true}>
      {/* Pass all necessary state and handlers to the editor component */}
      <ChapterFullEditor
          chapter={chapter} // Pass the initial loaded chapter data
          isAuthor={isAuthor}
          editedTitle={editedTitle}
          setEditedTitle={setEditedTitle}
          editedContent={editedContent}
          setEditedContent={setEditedContent}
          isLocked={isLocked}
          setIsLocked={setIsLocked}
          saving={saving}
          setSaving={setSaving} // Pass the setter down
          onSave={handleSave} // Pass the save handler
          onCancel={handleCancel} // Pass the cancel handler
      />
    </AdminRoleCheck>
  );
};

export default EditChapterPage;