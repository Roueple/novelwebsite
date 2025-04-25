// src/hooks/use-chapter-actions.ts
// This hook manages the editing state and determines if the user is an admin.

import { useState, useEffect, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { ChapterType, NovelType, UserRole } from '@/types/supabase';
// Removed updateChapter and toast imports as save logic is handled by the component using the hook

export function useChapterActions(
  chapter: ChapterType | null, // Keep chapter to initialize state
  user: User | null,
  role: UserRole | null
  // Removed 'novel' parameter as it's no longer needed for the admin-only check
) {
  // Editing state - managed locally within the hook
  const [editedTitle, setEditedTitle] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [saving, setSaving] = useState(false); // Keep saving state here

  // Determine if the user is an admin.
  // Access to editing is now solely based on the 'admin' role.
  const isAuthor = useMemo(() => {
     // User is considered 'authorized' for editing if their role is 'admin'
     return user !== null && role === 'admin';
  }, [user, role]); // Depend on user and role

  // Initialize state when chapter data is loaded or changes
  useEffect(() => {
    if (chapter) {
      setEditedTitle(chapter.title);
      setEditedContent(chapter.content || '');
      setIsLocked(chapter.is_locked);
    } else {
      // Reset if chapter becomes null (e.g., during loading/error)
      setEditedTitle('');
      setEditedContent('');
      setIsLocked(false);
    }
  }, [chapter]); // Depend only on chapter data

  // Expose state and setters
  return {
    isAuthor, // Expose the 'admin' status
    editedTitle,
    setEditedTitle,
    editedContent,
    setEditedContent,
    isLocked,
    setIsLocked,
    saving,
    setSaving, // Expose setter for saving state
  };
}
