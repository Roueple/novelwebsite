// src/hooks/use-chapter-actions.ts
import { useState, useEffect, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
// *** FIX: Import Novel type ***
import { Chapter, Novel, UserRole } from '@/types';

export function useChapterActions(
  chapter: Chapter | null,
  user: User | null,
  role: UserRole | null,
  setChapterState?: (chapter: Chapter | ((prevState: Chapter | null) => Chapter | null)) => void, // Allow functional updates
  // *** FIX: Change expected type to Novel | undefined ***
  novel?: Novel | undefined
) {
  const [editedTitle, setEditedTitle] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [saving, setSaving] = useState(false);

  // Determine if the user is an admin.
  const isAuthor = useMemo(() => {
     return user !== null && role === 'admin';
  }, [user, role]);

  // Initialize state when chapter data is loaded or changes
  useEffect(() => {
    if (chapter) {
      setEditedTitle(chapter.title);
      setEditedContent(chapter.content || '');
      setIsLocked(chapter.is_locked);
    } else {
      setEditedTitle('');
      setEditedContent('');
      setIsLocked(false);
    }
  }, [chapter]);

  // Placeholder save function (actual save logic is in the parent component)
  const handleSave = async () => {
    setSaving(true);
    console.warn('handleSave in useChapterActions is a placeholder and should be overridden by parent component logic.');
    try {
      // Simulate potential update if setter is provided
      if (setChapterState && chapter) {
         // Using functional update form for safety
         setChapterState((prev) => prev ? {
          ...prev,
          title: editedTitle,
          content: editedContent,
          is_locked: isLocked,
        } : null);
      }
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate async operation
      setSaving(false);
      return true;
    } catch (error) {
      console.error('Error in handleSave placeholder:', error);
      setSaving(false);
      return false;
    }
  };

  return {
    isAuthor,
    editedTitle,
    setEditedTitle,
    editedContent,
    setEditedContent,
    isLocked,
    setIsLocked,
    saving,
    setSaving,
    handleSave, // Include the placeholder save handler
  };
}