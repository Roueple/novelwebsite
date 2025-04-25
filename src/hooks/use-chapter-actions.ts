// src/hooks/use-chapter-actions.ts
// This hook is now simplified and primarily used for determining author status
// and potentially holding shared state/logic if needed across different editing contexts.
// The save logic has been moved to the components that use the full editor.

import { useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { ChapterType, NovelType, UserRole } from '@/types/supabase';

export function useChapterActions(
  chapter: ChapterType | null,
  user: User | null,
  role: UserRole | null,
  novel: NovelType | null,
  isCreator: boolean | null // Added isCreator here
) {
  // Determine if the user is an author of this specific novel
  const isAuthor = useMemo(() => {
     if (!user || !novel || role === null || isCreator === null) return false;
     const isAdmin = role === 'admin';
     const isNovelAuthor = isCreator && novel.author_id === user.id;
     return isAdmin || isNovelAuthor;
  }, [user, novel, role, isCreator]); // Added isCreator as a dependency

  // Removed state (editedTitle, editedContent, isLocked, saving)
  // Removed handlers (handleSave, handleLockToggle)

  return {
    isAuthor, // Expose for potential UI elements specific to author status
    // Removed other state and handlers
  };
}
