// src/components/chapter-title-editor.tsx
"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, X, Edit, Lock, Unlock, Trash2 } from 'lucide-react';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { cn } from '@/lib/utils';
import type { Chapter } from '@/types';

interface ChapterTitleEditorProps {
  chapter: Chapter; // This should now have chapter.is_locked as boolean
  novelId: number;
  isAuthor: boolean;
  isEditing: boolean;
  onStartEdit: (chapter: Chapter) => void;
  onCancelEdit: () => void;
  onSaveTitle: (chapterId: number, newTitle: string) => Promise<void>;
  onToggleLock: (chapterId: number, currentLockedStatus: boolean) => Promise<void>; // Expects boolean
  onDeleteChapter: (chapterId: number, chapterNumber: number) => Promise<void>;
  savingTitle: boolean;
  deletingChapter: boolean;
  togglingLock: boolean;
  bulkOperationInProgress: boolean;
  disabled?: boolean;
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
  disabled = false, // <-- ADDED: Destructure with default value
}: ChapterTitleEditorProps) {
  const [editedTitle, setEditedTitle] = useState(chapter.title);

  React.useEffect(() => {
    setEditedTitle(chapter.title);
  }, [chapter.title]);

  const handleSave = async () => {
    if (editedTitle.trim() === '') {
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

  // Combine all conditions that should disable interactions within this component
  // or passed down from the parent.
  const isAnyOperationInProgress = savingTitle || deletingChapter || togglingLock || bulkOperationInProgress || disabled;

  return (
    <div
      key={chapter.id}
      // Apply disabled styling if needed, e.g., slightly lower opacity overall when disabled from parent
      className={cn(
        "flex items-center justify-between p-2 rounded-md hover:bg-accent group",
        disabled && "opacity-70 pointer-events-none" // Example: Visually indicate disabled state
        )}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Edit button - Disable if any operation is in progress OR parent passes disabled */}
        {!isEditing && isAuthor && (
             <Button
                 variant="ghost"
                 size="icon"
                 className="h-7 w-7 text-muted-foreground flex-shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                 onClick={() => onStartEdit(chapter)}
                 disabled={isAnyOperationInProgress} // <-- Use combined check
                 aria-label={`Edit chapter ${chapter.chapter_number} title`}
             >
                 <Edit size={16} />
             </Button>
        )}

        {isEditing ? (
          // Chapter Title Edit Input (Uses its own savingTitle state for disabling)
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <Input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              className="flex-grow h-8 text-sm"
              disabled={savingTitle} // Disabled only when saving title itself
              aria-label={`Edit title for chapter ${chapter.chapter_number}`}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={onCancelEdit}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              disabled={savingTitle} // Disabled only when saving title itself
              aria-label="Cancel editing chapter title"
            >
              <X size={16} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSave}
              className="h-7 w-7 text-green-600 hover:text-green-500 hover:bg-green-500/10"
              disabled={savingTitle || editedTitle.trim() === ''} // Disabled when saving title or title empty
              aria-label="Save chapter title"
            >
              {savingTitle ? <LoadingSpinner size="sm" className="text-green-600" /> : <Check size={16} />}
            </Button>
          </div>
        ) : (
          // Chapter Title Display/Link (Should not be disabled)
          <Link
            href={`/novels/${novelId}/chapter/${chapter.chapter_number}`}
            className="flex-1 flex items-center justify-between min-w-0 mr-2 group/link"
            // Prevent navigation if parent component indicates disabled state? Optional.
            onClick={(e) => { if (disabled) e.preventDefault(); }}
            aria-disabled={disabled} // Indicate disabled state for accessibility
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

      {/* Author Controls for Chapter (Disable based on combined check) */}
      {isAuthor && !isEditing && (
        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
           {/* Individual Lock Toggle Button */}
           <Button
               variant="ghost"
               size="icon"
               onClick={handleToggle}
               className={cn(
                   "h-7 w-7 transition-colors",
                   chapter.is_locked ? 'text-destructive hover:text-destructive/80' : 'text-green-600 hover:text-green-600/80'
                   // Removed explicit opacity/cursor here, handled by Button's disabled state
               )}
               disabled={isAnyOperationInProgress} // <-- Use combined check
               aria-label={chapter.is_locked ? `Unlock chapter ${chapter.chapter_number}` : `Lock chapter ${chapter.chapter_number}`}
           >
               {togglingLock ? ( // Check specific operation for spinner
                   <LoadingSpinner size="sm" className={chapter.is_locked ? 'text-destructive' : 'text-green-600'}/>
               ) : chapter.is_locked ? (
                   <Lock size={16} />
               ) : (
                   <Unlock size={16} />
               )}
           </Button>

          {/* Delete Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            className={cn(
                "h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                // Removed explicit opacity/cursor here
            )}
            disabled={isAnyOperationInProgress} // <-- Use combined check
            aria-label={`Delete chapter ${chapter.chapter_number}`}
          >
            {deletingChapter ? ( // Check specific operation for spinner
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