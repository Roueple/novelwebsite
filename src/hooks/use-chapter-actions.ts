// src/hooks/use-chapter-actions.ts
import { useState } from 'react';
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

  // Handle saving chapter changes
  const handleSave = async () => {
    if (!chapter || !novel) return;
    
    setSaving(true);
    
    try {
      const success = await updateChapter(novel.id, chapter.id, {
        title: editedTitle,
        content: editedContent,
        is_locked: isLocked,
        newly_created: false
      });
      
      if (success) {
        // Update local state
        setChapter(prev => prev ? {
          ...prev,
          title: editedTitle,
          content: editedContent,
          is_locked: isLocked,
          newly_created: false
        } : null);
        
        setIsEditing(false);
        toast.success('Chapter saved successfully');
      } else {
        throw new Error('Failed to save chapter');
      }
    } catch (error) {
      console.error('Error saving chapter:', error);
      toast.error('Failed to save chapter');
    } finally {
      setSaving(false);
    }
  };

  // Handle toggling the locked status
  const handleLockToggle = async () => {
    if (!chapter || !novel) return;
    
    const newLockedState = !isLocked;
    setIsLocked(newLockedState);
    
    try {
      const success = await updateChapter(novel.id, chapter.id, {
        is_locked: newLockedState
      });
      
      if (success) {
        setChapter(prev => prev ? {
          ...prev,
          is_locked: newLockedState
        } : null);
        
        toast.success(`Chapter ${newLockedState ? 'locked' : 'unlocked'} successfully`);
      } else {
        // Revert the change if it failed
        setIsLocked(!newLockedState);
        throw new Error('Failed to update locked status');
      }
    } catch (error) {
      console.error('Error toggling lock:', error);
      toast.error('Failed to update chapter status');
    }
  };

  return {
    isAuthor,
    isEditing,
    setIsEditing,
    isLocked,
    setIsLocked,
    editedTitle,
    setEditedTitle,
    editedContent,
    setEditedContent,
    saving,
    handleSave,
    handleLockToggle
  };
}