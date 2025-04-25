// src/app/novels/[id]/chapter/[chapterId]/edit/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { ChapterType, NovelType } from '@/types/supabase';
import { useAuth } from '@/providers/auth-provider';
import { getChapter, getNovel, updateChapter } from '@/lib/api'; // Import updateChapter
import { supabase } from '@/lib/supabase';
import LoadingScreen from '@/components/ui/loading-screen';
import NotFoundScreen from '@/components/ui/not-found-screen';
import AdminRoleCheck from '@/components/auth/admin-role-check';
import ChapterFullEditor from '@/components/chapter-full-editor'; // Import the new component
import { useChapterActions } from '@/hooks/use-chapter-actions'; // Import the hook

const EditChapterPage = () => {
  // Destructure user, role, loading from useAuth
  const { user, role, loading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const novelId = Number(params.id);
  const chapterNumber = Number(params.chapterId);

  const [loading, setLoading] = useState(true); // Loading for novel/chapter data
  const [loadError, setLoadError] = useState<string | null>(null); // Added loadError state
  const [chapter, setChapterState] = useState<ChapterType | null>(null);
  const [novel, setNovel] = useState<NovelType | null>(null);

  // Use the useChapterActions hook to manage editing state and get isAuthor (based on role === 'admin')
  // Pass user, role, and chapter to the hook
  const {
      isAuthor, // Get isAuthor from the hook
      editedTitle,
      setEditedTitle,
      editedContent,
      setEditedContent,
      isLocked,
      setIsLocked,
      saving, // Get saving state from the hook
      setSaving, // Get saving state setter from the hook
  } = useChapterActions(chapter, user, role); // Pass chapter to the hook


  // --- Fetch Data ---
  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null); // Reset error state on new load attempt
    if (isNaN(novelId) || isNaN(chapterNumber)) {
      setLoadError('Invalid novel or chapter ID.');
      setLoading(false);
      toast.error('Invalid URL parameters.');
      router.push('/');
      return;
    }
    try {
      const [fetchedChapter, fetchedNovel] = await Promise.all([
        getChapter(novelId, chapterNumber),
        getNovel(novelId)
      ]);
      if (!fetchedNovel) throw new Error('Novel not found');
      if (!fetchedChapter) throw new Error('Chapter not found');
      setNovel(fetchedNovel);
      setChapterState(fetchedChapter);
       // The useChapterActions hook will initialize its state when chapter changes
       // No need to set local editing state here anymore.

    } catch (error: any) {
      console.error('Error loading chapter data for edit:', error);
      const message = error.message || 'Failed to load chapter data.';
      setLoadError(message); // Set error state
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


  // Handle Save Action (calls the API directly or via a simple local function)
  const handleSave = async (): Promise<boolean> => { // No longer accepts data as arguments
      // Check authorization here before attempting to save
      if (!user || role !== 'admin' || !chapter || !novel) {
          toast.error("Cannot save: Insufficient permissions or missing data.");
          return false;
      }

      setSaving(true); // Set saving state for this page via hook setter
      toast.info('Saving chapter...');

      try {
          // Direct API call for saving from this page, using state from the hook
          const success = await updateChapter(novel.id, chapter.id, {
              title: editedTitle.trim(), // Use state from hook
              content: editedContent, // Use state from hook
              is_locked: isLocked, // Use state from hook
              newly_created: false // Mark as not newly created after first save
          });

          if (success) {
               // Update local state after successful save
               setChapterState(prev => prev ? {
                   ...prev,
                   title: editedTitle.trim(), // Update with state from hook
                   content: editedContent, // Update with state from hook
                   is_locked: isLocked, // Update with state from hook
                   newly_created: false,
                   updated_at: new Date().toISOString() // Reflect update time locally
               } : null);
               toast.success('Chapter saved successfully');
           // Clear autosave draft on successful save
           const autosaveKey = `chapter_draft_${novelId}_${chapter?.id ?? 'new'}`;
           localStorage.removeItem(autosaveKey);

          } else {
               toast.error('Failed to save chapter. Please check console for details.');
          }
          return success;
      } catch (error) {
          console.error('Error saving chapter:', error);
          toast.error('Failed to save chapter. Please check console for details.');
          return false;
      } finally {
          setSaving(false); // Clear saving state for this page via hook setter
      }
  };

  // Handle Cancel Action (navigates back)
  const handleCancel = () => {
    // Navigation logic remains here as it's page-specific
    // Check for unsaved changes using state from the hook
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

    router.push(`/novels/${novelId}/chapter/${chapterNumber}`);
  };


  // --- Loading and Error Handling ---
  // Show loading if novel/chapter data is loading OR auth status is loading
  if (loading || authLoading) {
    return <LoadingScreen message="Loading chapter editor..." />;
  }

  // Handle invalid ID error specifically before checking !novel
  if (loadError?.includes("Invalid Novel ID")) { // Use loadError
      return <NotFoundScreen message={loadError} returnUrl="/" returnText="Return to Home" />; // Use loadError
  }

  if (loadError || !novel || !chapter) { // Use loadError
    return <NotFoundScreen message={loadError || "Chapter or Novel data missing."} returnUrl={`/novels/${novelId || ''}`} returnText="Back to Novel"/>; // Use loadError
  }

  // AdminRoleCheck will handle the overall authorization for the page
  // It checks if role is 'admin' because allowAuthor={true} is passed
  return (
    <AdminRoleCheck allowAuthor={true}> {/* Ensure this page is protected */}
      {/* Render the full editor component, passing local state and setters */}
      <ChapterFullEditor
          chapter={chapter} // Pass initial chapter data for reference
          isAuthor={isAuthor} // Pass determined author status (admin or not)
          editedTitle={editedTitle} // Pass state from hook
          setEditedTitle={setEditedTitle} // Pass setter from hook
          editedContent={editedContent} // Pass state from hook
          setEditedContent={setEditedContent} // Pass setter from hook
          isLocked={isLocked} // Pass state from hook
          setIsLocked={setIsLocked} // Pass setter from hook
          saving={saving} // Pass saving state from this page
          setSaving={setSaving} // Pass saving state setter from this page
          onSave={handleSave} // Pass the save handler from this page
          onCancel={handleCancel} // Pass the cancel handler (navigation)
      />
    </AdminRoleCheck>
  );
};

export default EditChapterPage;
