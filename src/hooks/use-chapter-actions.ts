// src/hooks/use-chapter-actions.ts
import { useState, useEffect } from 'react';
import { updateChapter } from '@/lib/api';
import { User } from '@supabase/supabase-js';
import { ChapterType, NovelType } from '@/types/supabase';
import { toast } from 'sonner';

type UserRole = 'admin' | 'author' | 'reader';

export function useChapterActions(
  chapter: ChapterType | null,
  user: User | null,
  role: UserRole | null,
  setChapter: React.Dispatch<React.SetStateAction<ChapterType | null>>,
  novel: NovelType | null
) {
  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [saving, setSaving] = useState(false);

  // Determine if the user is an author of this novel
  const isAdmin = role === 'admin';
  const isNovelAuthor = novel?.author_id === user?.id;
  const isAuthor = isAdmin || isNovelAuthor;

  // Initialize state when chapter data is loaded
  useEffect(() => {
    if (chapter) {
      setEditedTitle(chapter.title);
      setEditedContent(chapter.content || '');
      setIsLocked(chapter.is_locked);

      // Automatically enter edit mode for newly created chapters by the author
      if (chapter.newly_created && isAuthor) {
        setIsEditing(true);
      }
    } else {
      // Reset if chapter becomes null
      setIsEditing(false);
      setEditedTitle('');
      setEditedContent('');
      setIsLocked(false);
    }
    // Dependency array includes chapter and isAuthor to re-evaluate if they change
  }, [chapter, isAuthor]);


  // Handle saving chapter changes
  const handleSave = async () => {
    if (!chapter || !novel || !isAuthor) return; // Ensure user is authorized

    setSaving(true);
    toast.info('Saving chapter...');

    try {
      const success = await updateChapter(novel.id, chapter.id, {
        title: editedTitle.trim(), // Trim title
        content: editedContent, // Content might need specific trimming rules depending on format
        is_locked: isLocked,
        newly_created: false // Mark as not newly created after first save
      });

      if (success) {
        // Update local state immediately for better UX
        setChapter(prev => prev ? {
          ...prev,
          title: editedTitle.trim(),
          content: editedContent,
          is_locked: isLocked,
          newly_created: false // Reflect the change locally
        } : null);

        setIsEditing(false); // Exit editing mode after successful save
        toast.success('Chapter saved successfully');
      } else {
        throw new Error('API returned failure on save');
      }
    } catch (error) {
      console.error('Error saving chapter:', error);
      toast.error('Failed to save chapter. Please check console for details.');
    } finally {
      setSaving(false);
    }
  };

  // Handle toggling the locked status
  const handleLockToggle = async () => {
    if (!chapter || !novel || !isAuthor) return; // Ensure user is authorized

    const newLockedState = !isLocked;

    // Optimistically update UI
    setIsLocked(newLockedState);
    setChapter(prev => prev ? { ...prev, is_locked: newLockedState } : null);
    toast.info(`Updating status to ${newLockedState ? 'locked' : 'unlocked'}...`);


    try {
      const success = await updateChapter(novel.id, chapter.id, {
        is_locked: newLockedState
      });

      if (success) {
        // Confirmation toast
        toast.success(`Chapter ${newLockedState ? 'locked' : 'unlocked'} successfully`);
      } else {
        // Revert the change if API call failed
        setIsLocked(!newLockedState);
        setChapter(prev => prev ? { ...prev, is_locked: !newLockedState } : null);
        throw new Error('API returned failure on lock toggle');
      }
    } catch (error) {
      // Revert the change on error
      setIsLocked(!newLockedState);
      setChapter(prev => prev ? { ...prev, is_locked: !newLockedState } : null);
      console.error('Error toggling lock:', error);
      toast.error('Failed to update chapter status. Please check console.');
    }
  };

  // Expose a cancel function to revert changes
  const handleCancelEdit = () => {
     if (!chapter) return;
     setIsEditing(false);
     setEditedTitle(chapter.title);
     setEditedContent(chapter.content || '');
     setIsLocked(chapter.is_locked); // Also reset lock state if changed during edit
  };

  return {
    isAuthor,
    isEditing,
    setIsEditing,
    isLocked,
    setIsLocked, // Keep this if direct manipulation is needed outside toggle
    editedTitle,
    setEditedTitle,
    editedContent,
    setEditedContent,
    saving,
    handleSave,
    handleLockToggle,
    handleCancelEdit // Expose cancel function
  };
}