// src/components/chapter-title-editor.tsx
"use client";

import React, { useState } from 'react';
import Link from 'next/link'; // Import Link
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, X, Edit, Lock, Unlock, Trash2 } from 'lucide-react'; // Import Trash2
import LoadingSpinner from '@/components/ui/loading-spinner';
import { cn } from '@/lib/utils';
import type { ChapterType } from '@/types/supabase';

interface ChapterTitleEditorProps {
  chapter: ChapterType;
  novelId: number; // Needed for the Link href
  isAuthor: boolean;
  isEditing: boolean; // State controlled by parent (NovelPage)
  onStartEdit: (chapter: ChapterType) => void;
  onCancelEdit: () => void;
  onSaveTitle: (chapterId: number, newTitle: string) => Promise<void>;
  onToggleLock: (chapterId: number, currentLockedStatus: boolean) => Promise<void>;
  onDeleteChapter: (chapterId: number, chapterNumber: number) => Promise<void>;
  savingTitle: boolean; // State controlled by parent (NovelPage)
  deletingChapter: boolean; // State controlled by parent (NovelPage)
  togglingLock: boolean; // State controlled by parent (NovelPage)
  // Pass down the bulk loading state to disable individual buttons during bulk ops
  bulkOperationInProgress: boolean;
}

export default function ChapterTitleEditor({
  chapter,
  novelId,
  isAuthor,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onSaveTitle,
  onToggleLock,
  onDeleteChapter,
  savingTitle,
  deletingChapter,
  togglingLock,
  bulkOperationInProgress,
}: ChapterTitleEditorProps) {
  const [editedTitle, setEditedTitle] = useState(chapter.title);

  // Update local state if initial chapter title changes (e.g., after a save in parent)
  React.useEffect(() => {
    setEditedTitle(chapter.title);
  }, [chapter.title]);

  const handleSave = async () => {
    if (editedTitle.trim() === '') {
      // Prevent saving empty title
      return;
    }
    await onSaveTitle(chapter.id, editedTitle.trim());
  };

  const handleDelete = async () => {
     await onDeleteChapter(chapter.id, chapter.chapter_number);
  }

  const handleToggle = async () => {
     await onToggleLock(chapter.id, chapter.is_locked);
  }

  // Disable all actions if any operation (local or bulk) is in progress
  const isAnyOperationInProgress = savingTitle || deletingChapter || togglingLock || bulkOperationInProgress;


  return (
    <div
      key={chapter.id}
      className="flex items-center justify-between p-2 rounded-md hover:bg-accent group"
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Edit button - Only visible on hover/focus when not editing */}
        {!isEditing && isAuthor && (
             <Button
                 variant="ghost"
                 size="icon"
                 className="h-7 w-7 text-muted-foreground flex-shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                 onClick={() => onStartEdit(chapter)}
                 disabled={isAnyOperationInProgress} // Disable if any operation is in progress
                 aria-label={`Edit chapter ${chapter.chapter_number} title`}
             >
                 <Edit size={16} />
             </Button>
        )}


        {isEditing ? (
          // Chapter Title Edit Input
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <Input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              className="flex-grow h-8 text-sm"
              disabled={savingTitle}
              aria-label={`Edit title for chapter ${chapter.chapter_number}`}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={onCancelEdit}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              disabled={savingTitle}
              aria-label="Cancel editing chapter title"
            >
              <X size={16} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSave}
              className="h-7 w-7 text-green-600 hover:text-green-500 hover:bg-green-500/10"
              disabled={savingTitle || editedTitle.trim() === ''}
              aria-label="Save chapter title"
            >
              {savingTitle ? <LoadingSpinner size="sm" className="text-green-600" /> : <Check size={16} />}
            </Button>
          </div>
        ) : (
          // Chapter Title Display/Link
          <Link
            href={`/novels/${novelId}/chapter/${chapter.chapter_number}`}
            className="flex-1 flex items-center justify-between min-w-0 mr-2 group/link"
          >
            <span className="text-sm text-foreground truncate group-hover/link:text-primary group-hover/link:underline underline-offset-2">
              Chapter {chapter.chapter_number}: {chapter.title}
            </span>
            {chapter.is_locked && (
              <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-secondary text-muted-foreground flex-shrink-0">
                Locked
              </span>
            )}
          </Link>
        )}
      </div>

      {/* Author Controls for Chapter (Always visible if isAuthor, unless editing title) */}
      {isAuthor && !isEditing && ( // Only show these buttons when not editing the title
        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
           {/* Individual Lock Toggle Button */}
           <Button
               variant="ghost"
               size="icon"
               onClick={handleToggle}
               className={cn(
                   "h-7 w-7 transition-colors",
                   chapter.is_locked ? 'text-destructive hover:text-destructive/80' : 'text-green-600 hover:text-green-600/80',
                   { 'opacity-50 cursor-not-allowed': isAnyOperationInProgress } // Disable based on any operation
               )}
               disabled={isAnyOperationInProgress}
               aria-label={chapter.is_locked ? `Unlock chapter ${chapter.chapter_number}` : `Lock chapter ${chapter.chapter_number}`}
           >
               {togglingLock ? (
                   <LoadingSpinner size="sm" className={chapter.is_locked ? 'text-destructive' : 'text-green-600'}/>
               ) : chapter.is_locked ? (
                   <Lock size={16} />
               ) : (
                   <Unlock size={16} />
               )}
           </Button>

          {/* Delete Button - Still hidden by default, appears on hover */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            className={cn(
                "h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity",
                { 'opacity-50 cursor-not-allowed': isAnyOperationInProgress } // Disable based on any operation
            )}
            disabled={isAnyOperationInProgress}
            aria-label={`Delete chapter ${chapter.chapter_number}`}
          >
            {deletingChapter ? (
                <LoadingSpinner size="sm" className="text-destructive"/>
            ) : (
              <Trash2 size={16} />
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
