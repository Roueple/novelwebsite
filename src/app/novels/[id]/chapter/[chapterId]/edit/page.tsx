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
// Removed useChapterActions import - logic is now inside ChapterFullEditor or handled by page

const EditChapterPage = () => {
  // Destructure isCreator from useAuth
  const { user, role, isCreator } = useAuth();
  const params = useParams();
  const router = useRouter();
  const novelId = Number(params.id);
  const chapterNumber = Number(params.chapterId);

  const [loading, setLoading] = useState(true);
  const [initialLoadError, setInitialLoadError] = useState<string | null>(null);
  const [chapter, setChapterState] = useState<ChapterType | null>(null);
  const [novel, setNovel] = useState<NovelType | null>(null);

  // --- Fetch Data ---
  const loadData = useCallback(async () => {
    setLoading(true);
    setInitialLoadError(null);
    if (isNaN(novelId) || isNaN(chapterNumber)) {
      setInitialLoadError('Invalid novel or chapter ID.');
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
    } catch (error: any) {
      console.error('Error loading chapter data for edit:', error);
      const message = error.message || 'Failed to load chapter data.';
      setInitialLoadError(message);
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

  // Determine Author Status using role and isCreator
  const isAuthor = React.useMemo(() => {
    // Check if user, novel, role, and isCreator status are available
    if (!user || !novel || role === null || isCreator === null) return false;
    const isAdmin = role === 'admin';
    // A user is an author of THIS novel if they are a creator AND their user ID matches the novel's author_id
    const isNovelAuthor = isCreator && novel.author_id === user.id;
    // User has authoring privileges on this page if they are an admin OR the specific novel's author
    return isAdmin || isNovelAuthor;
  }, [user, novel, role, isCreator]); // Added isCreator as a dependency


  // Handle Save Action (calls the API directly or via a simple local function)
  const handleSave = async (title: string, content: string, isLocked: boolean): Promise<boolean> => {
      if (!chapter || !novel || !isAuthor) {
          toast.error("Cannot save: Missing data or insufficient permissions.");
          return false;
      }

      // Direct API call for saving from this page
      const success = await updateChapter(novel.id, chapter.id, {
          title: title.trim(),
          content: content,
          is_locked: isLocked,
          newly_created: false // Mark as not newly created after first save
      });

      if (success) {
           // Update local state after successful save
           setChapterState(prev => prev ? {
               ...prev,
               title: title.trim(),
               content: content,
               is_locked: isLocked,
               newly_created: false,
               updated_at: new Date().toISOString() // Reflect update time locally
           } : null);
           toast.success('Chapter saved successfully');
      } else {
           toast.error('Failed to save chapter. Please check console for details.');
      }
      return success;
  };

  // Handle Cancel Action (navigates back)
  const handleCancel = () => {
    // Navigation logic remains here as it's page-specific
    router.push(`/novels/${novelId}/chapter/${chapterNumber}`);
  };


  // --- Loading and Error Handling ---
  if (loading) return <LoadingScreen message="Loading chapter editor..." />;
  if (initialLoadError) return <NotFoundScreen message={initialLoadError} returnUrl={`/novels/${novelId || ''}`} returnText="Back to Novel" />;
  if (!chapter || !novel) return <NotFoundScreen message="Chapter or Novel data missing." returnUrl={`/novels/${novelId || ''}`} returnText="Back to Novel"/>;

  // AdminRoleCheck will handle the overall authorization for the page
  return (
    <AdminRoleCheck allowAuthor={true}> {/* Ensure this page is protected */}
      {/* Render the full editor component */}
      <ChapterFullEditor
          chapter={chapter}
          isAuthor={isAuthor} // Pass determined author status
          onSave={handleSave} // Pass the save handler
          onCancel={handleCancel} // Pass the cancel handler (navigation)
      />
    </AdminRoleCheck>
  );
};

export default EditChapterPage;
