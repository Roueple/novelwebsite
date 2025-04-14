// src/hooks/use-chapter-actions.ts
import { useState, useEffect, useMemo } from 'react';
import { updateChapter } from '@/lib/api';
import { User } from '@supabase/supabase-js';
import { ChapterType, NovelType, UserRole } from '@/types/supabase';
import { toast } from 'sonner';

// type UserRole = 'admin' | 'author' | 'reader'; // Already defined in types

export function useChapterActions(
  chapter: ChapterType | null,
  user: User | null,
  role: UserRole | null,
  setChapterState: React.Dispatch<React.SetStateAction<ChapterType | null>>, // Renamed for clarity
  novel: NovelType | null
) {
  // Editing state - managed locally within the hook
  const [editedTitle, setEditedTitle] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [saving, setSaving] = useState(false);

  // Determine if the user is an author of this novel
  const isAuthor = useMemo(() => {
     if (!user || !novel || !role) return false;
     return role === 'admin' || novel.author_id === user.id;
  }, [user, novel, role]);

  // Initialize state when chapter data is loaded or changes
  useEffect(() => {
    if (chapter) {
      setEditedTitle(chapter.title);
      setEditedContent(chapter.content || '');
      setIsLocked(chapter.is_locked);
      // Note: The 'isEditing' state is managed by the calling component (the edit page)
      // This hook now focuses solely on managing the *data* being edited.
    } else {
      // Reset if chapter becomes null (e.g., during loading/error)
      setEditedTitle('');
      setEditedContent('');
      setIsLocked(false);
    }
  }, [chapter]); // Depend only on chapter data


  // Handle saving chapter changes
  const handleSave = async (): Promise<boolean> => { // Return boolean success status
    if (!chapter || !novel || !isAuthor) {
        toast.error("Cannot save: Missing data or insufficient permissions.");
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
        newly_created: false // Mark as not newly created after first save
      });

      if (success) {
        // Update parent component's state immediately for UI consistency
        setChapterState(prev => prev ? {
          ...prev,
          title: editedTitle.trim(),
          content: editedContent,
          is_locked: isLocked,
          newly_created: false,
          updated_at: new Date().toISOString() // Reflect update time locally
        } : null);
        toast.success('Chapter saved successfully');
      } else {
        throw new Error('API returned failure on save');
      }
    } catch (error) {
      console.error('Error saving chapter:', error);
      toast.error('Failed to save chapter. Please check console for details.');
      success = false;
    } finally {
      setSaving(false);
    }
    return success;
  };

  // Handle toggling the locked status
  const handleLockToggle = async (): Promise<boolean> => { // Return boolean success status
    if (!chapter || !novel || !isAuthor) {
        toast.error("Cannot change lock status: Missing data or insufficient permissions.");
        return false;
    }

    const newLockedState = !isLocked;
    const originalLockedState = isLocked; // Store original state for potential revert

    // Optimistically update UI
    setIsLocked(newLockedState);
    setChapterState(prev => prev ? { ...prev, is_locked: newLockedState } : null);
    toast.info(`Updating status to ${newLockedState ? 'locked' : 'unlocked'}...`);

    let success = false;
    try {
      success = await updateChapter(novel.id, chapter.id, {
        is_locked: newLockedState
      });

      if (success) {
        toast.success(`Chapter ${newLockedState ? 'locked' : 'unlocked'} successfully`);
      } else {
        // Revert the change if API call indicated failure
        setIsLocked(originalLockedState);
        setChapterState(prev => prev ? { ...prev, is_locked: originalLockedState } : null);
        throw new Error('API returned failure on lock toggle');
      }
    } catch (error) {
      // Revert the change on any error
      setIsLocked(originalLockedState);
      setChapterState(prev => prev ? { ...prev, is_locked: originalLockedState } : null);
      console.error('Error toggling lock:', error);
      toast.error('Failed to update chapter status. Please check console.');
      success = false;
    }
    return success;
  };

  // Note: No handleCancelEdit here, as cancelling is handled by navigating away
  // from the dedicated edit page.

  return {
    isAuthor, // Expose for potential UI elements specific to author status
    // No need to expose isEditing or setIsEditing from here
    isLocked,
    setIsLocked, // Allow direct manipulation if needed, though toggle is preferred
    editedTitle,
    setEditedTitle,
    editedContent,
    setEditedContent,
    saving,
    handleSave,
    handleLockToggle,
  };
}