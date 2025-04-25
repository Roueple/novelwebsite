// src/components/chapter-full-editor.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Save, X, Lock, Unlock, Eye, Code, SparklesIcon, Trash2, ChevronUp, ChevronDown,
  SplitSquareVertical, HelpCircle
} from 'lucide-react';
import TextEffectsToolbar from '@/components/editor/text-effects-toolbar';
import DynamicText from '@/components/reading/dynamic-text';
import TextEffectsExample from '@/components/reading/text-effects-example'; // Import TextEffectsExample
import { toast } from 'sonner';
import type { ChapterType } from '@/types/supabase';
import { cn } from '@/lib/utils';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'; // Import Dialog components

interface ChapterFullEditorProps {
  chapter: ChapterType;
  isAuthor: boolean;
  onSave: (title: string, content: string, isLocked: boolean) => Promise<boolean>; // Save returns success status
  onCancel: () => void;
}

export default function ChapterFullEditor({
  chapter,
  isAuthor,
  onSave,
  onCancel,
}: ChapterFullEditorProps) {
  // State for editing chapter data
  const [editedTitle, setEditedTitle] = useState(chapter.title);
  const [editedContent, setEditedContent] = useState(chapter.content || '');
  const [isLocked, setIsLocked] = useState(chapter.is_locked);

  // UI State
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'raw' | 'preview' | 'split'>('raw');
  const [effectsEnabledInPreview, setEffectsEnabledInPreview] = useState(true);
  const [headerVisible, setHeaderVisible] = useState(true); // State for header visibility
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null); // State for autosave time

  // Refs
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Autosave Logic
  const autosaveKey = `chapter_draft_${chapter.novel_id}_${chapter.id}`;

  useEffect(() => {
    // Load autosaved draft on mount if it's newer than the last updated chapter
    try {
      const savedDraft = localStorage.getItem(autosaveKey);
      if (savedDraft) {
        const { title, content, locked, timestamp } = JSON.parse(savedDraft);
        const draftDate = new Date(timestamp);
        const chapterUpdateDate = chapter.updated_at ? new Date(chapter.updated_at) : new Date(0);
        if (draftDate > chapterUpdateDate) {
          setEditedTitle(title);
          setEditedContent(content);
          setIsLocked(locked);
          setLastSavedTime(draftDate);
        }
      }
    } catch (e) {
      console.error("Failed to load or parse draft", e);
    }
  }, [chapter, autosaveKey]); // Depend on chapter and autosaveKey

  useEffect(() => {
    // Autosave timer
    const handler = setTimeout(() => {
      try {
        localStorage.setItem(autosaveKey, JSON.stringify({
          title: editedTitle,
          content: editedContent,
          locked: isLocked,
          timestamp: new Date().toISOString()
        }));
        setLastSavedTime(new Date());
      } catch (e) {
        console.error("Autosave failed", e);
      }
    }, 3000); // Autosave every 3 seconds

    return () => clearTimeout(handler); // Clear timer on unmount or state change
  }, [editedTitle, editedContent, isLocked, autosaveKey]); // Depend on editing states

  // Scroll Synchronization
  const synchronizeScroll = useCallback((sourceElement: HTMLElement) => {
    if (!sourceElement) return;

    let targetElement: HTMLElement | null = null;

    if (sourceElement === editorRef.current && previewRef.current) {
      targetElement = previewRef.current;
    } else if (sourceElement === previewRef.current && editorRef.current) {
      targetElement = editorRef.current;
    }

    if (!targetElement) return;

    const sourceScrollMax = sourceElement.scrollHeight - sourceElement.clientHeight;
    const targetScrollMax = targetElement.scrollHeight - targetElement.clientHeight;

    if (sourceScrollMax <= 0 || targetScrollMax <= 0) return;

    const scrollPercentage = sourceElement.scrollTop / sourceScrollMax;
    targetElement.scrollTop = scrollPercentage * targetScrollMax;
  }, []); // No dependencies needed for useCallback

  useEffect(() => {
    // Attach scroll event listeners only in split view
    if (viewMode !== 'split') return;

    const editorElement = editorRef.current;
    const previewElement = previewRef.current;

    if (!editorElement || !previewElement) return;

    let isScrolling = false;

    const handleEditorScroll = () => {
      if (isScrolling) return;
      isScrolling = true;
      synchronizeScroll(editorElement);
      setTimeout(() => { isScrolling = false; }, 50);
    };

    const handlePreviewScroll = () => {
      if (isScrolling) return;
      isScrolling = true;
      synchronizeScroll(previewElement);
      setTimeout(() => { isScrolling = false; }, 50);
    };

    editorElement.addEventListener('scroll', handleEditorScroll);
    previewElement.addEventListener('scroll', handlePreviewScroll);

    return () => {
      editorElement.removeEventListener('scroll', handleEditorScroll);
      previewElement.removeEventListener('scroll', handlePreviewScroll);
    };
  }, [viewMode, synchronizeScroll]); // Depend on viewMode and synchronizeScroll

  // View Mode Cycling
  const cycleViewMode = () => {
    setViewMode(current => {
      if (current === 'raw') return 'preview';
      if (current === 'preview') return 'split';
      return 'raw';
    });
  };

  // Remove All Effects
  const handleRemoveAllEffects = () => {
    if (confirm("Are you sure you want to remove ALL text effect tags (e.g., [shout]) from this chapter? This cannot be undone easily.")) {
      setEditedContent(currentContent => {
        const pattern = /\[[a-zA-Z]+\]/g;
        const newContent = currentContent.replace(pattern, '');
        toast.success("All text effect tags removed.");
        return newContent;
      });
    }
  };

  // Handle Save Action
  const handleSave = async () => {
    setSaving(true);
    const success = await onSave(editedTitle.trim(), editedContent, isLocked);
    if (success) {
      localStorage.removeItem(autosaveKey); // Clear draft on successful save
    }
    setSaving(false);
  };

  // Handle Cancel Action
  const handleCancel = () => {
    const hasChanges = editedTitle !== chapter.title ||
      editedContent !== (chapter.content || '') ||
      isLocked !== chapter.is_locked;

    if (hasChanges) {
      const discard = confirm("You have unsaved changes in this draft. Discard draft?");
      if (!discard) return;
    }
    localStorage.removeItem(autosaveKey); // Clear draft on cancel
    onCancel(); // Call the parent's cancel handler (navigation)
  };

  // If not authorized, render nothing or a message (AdminRoleCheck handles redirection)
  if (!isAuthor) {
      return null; // AdminRoleCheck higher up will redirect if not authorized
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      {/* Header Section (Non-Sticky, Toggleable) */}
      {headerVisible ? (
        <div className="relative w-full bg-background border-b border-border shadow-sm px-4 md:px-8 py-3 mb-4">
          <div className="flex flex-col">
            {/* Title Input Area */}
            <div className='flex flex-col w-full'>
              <h1 className="text-sm md:text-base font-semibold text-muted-foreground mb-1">Edit Chapter {chapter.chapter_number}</h1>
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                placeholder="Chapter Title"
                className="text-lg font-semibold h-10"
                disabled={saving}
                aria-label="Chapter Title"
              />

              {/* Lock Status Indicator */}
              <div className="flex items-center mt-2">
                <div className={cn(
                  "px-2 py-1 rounded-full text-xs font-medium",
                  isLocked
                    ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                    : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                )}>
                  {isLocked ? 'Premium (Locked)' : 'Free (Unlocked)'}
                </div>
                <div className="ml-2 text-xs text-muted-foreground">
                  {isLocked
                    ? "Readers need a subscription to access this chapter"
                    : "This chapter is free for all readers"}
                </div>
              </div>
            </div>

            {/* Controls Row - Static Layout */}
            <div className="flex items-center flex-wrap gap-2 mt-4 border-t border-border pt-4">
              <div className="flex gap-2 items-center mr-auto">
                {/* View Mode Controls - Always in the same position */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={cycleViewMode}
                  className="gap-1"
                  aria-label="Change view mode"
                >
                  {viewMode === 'raw' && (
                    <>
                      <Eye size={16} />
                      <span>Preview</span>
                    </>
                  )}
                  {viewMode === 'preview' && (
                    <>
                      <SplitSquareVertical size={16} />
                      <span>Split View</span>
                    </>
                  )}
                  {viewMode === 'split' && (
                    <>
                      <Code size={16} />
                      <span>Raw Text</span>
                    </>
                  )}
                </Button>

                {/* Effects Toggle - Always visible, but only enabled in preview/split modes */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEffectsEnabledInPreview(!effectsEnabledInPreview)}
                  className={cn(
                    "gap-1",
                    effectsEnabledInPreview
                      ? 'text-yellow-500 hover:text-yellow-600'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  aria-label={effectsEnabledInPreview ? 'Disable effects' : 'Enable effects'}
                  disabled={viewMode === 'raw' || saving}
                >
                  <SparklesIcon size={16} />
                  <span>Effects</span>
                </Button>

                {/* Effects Removal - Always visible but only enabled in raw mode */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveAllEffects}
                  disabled={saving || viewMode === 'preview'}
                  className="gap-1 text-destructive hover:bg-destructive/10 disabled:opacity-50"
                  aria-label="Remove all text effects"
                >
                  <Trash2 size={16} />
                  <span className="hidden sm:inline">Remove Effects</span>
                </Button>

                 {/* Text Effects Guide Dialog */}
                 <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1" disabled={saving}>
                        <HelpCircle size={16} />
                        <span className="hidden sm:inline">Guide</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-background text-foreground border border-border">
                      <DialogHeader>
                        <DialogTitle className="text-foreground">Text Effects Guide</DialogTitle>
                      </DialogHeader>
                      <TextEffectsExample /> {/* Use the imported example component */}
                    </DialogContent>
                  </Dialog>

              </div>

              {/* Last saved indicator - Fixed position */}
              {lastSavedTime && (
                <span className="text-xs text-muted-foreground hidden sm:inline" aria-live="polite">
                  Saved: {lastSavedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}

              <div className="flex items-center gap-2">
                {/* Lock Toggle Button - Fixed position */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsLocked(!isLocked)} // Direct state toggle for editor view
                  disabled={saving}
                  className={cn(
                    "gap-1",
                    isLocked
                      ? 'text-destructive border-destructive hover:bg-destructive/10'
                      : 'text-green-600 border-green-600 hover:bg-green-500/10'
                  )}
                >
                  {saving ? ( // Use saving state for spinner in editor
                    <LoadingSpinner className="mr-1" size="sm"/>
                  ) : isLocked ? (
                    <Lock size={16} />
                  ) : (
                    <Unlock size={16} />
                  )}
                  <span>{isLocked ? 'Locked' : 'Unlocked'}</span>
                </Button>

                {/* Cancel Button - Fixed position */}
                <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}>
                  <X size={16} className="mr-1"/> Cancel
                </Button>

                {/* Save Button - Fixed position */}
                <Button size="sm" onClick={handleSave} disabled={saving || editedTitle.trim() === ''} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Save size={16} className="mr-1" /> {saving ? 'Saving...' : 'Save'}
                </Button>

                {/* Hide Header Button - Fixed position */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setHeaderVisible(false)}
                  title="Hide header"
                  className="ml-2"
                >
                  <ChevronUp size={16} />
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Floating show header button
        <div className="fixed top-2 right-2 z-30">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setHeaderVisible(true)}
            title="Show header"
            className="bg-background/80 backdrop-blur-sm border border-border shadow-md"
          >
            <ChevronDown size={16} />
            <span className="sr-only">Show header</span>
          </Button>
        </div>
      )}

      {/* Text Effects Toolbar - Only show in raw and split views */}
      {(viewMode === 'raw' || viewMode === 'split') && (
        <div className="relative bg-background py-2 mb-4">
          <TextEffectsToolbar
            editorRef={editorRef}
            setContent={setEditedContent}
            disabled={saving} // Disable toolbar while saving
          />
        </div>
      )}

      {/* Main Editor Content Area - Conditional Views */}
      <div className="mt-4">
        {/* Raw Text Editor View */}
        {viewMode === 'raw' && (
          <div className="w-full">
            <label htmlFor="chapter-content-editor-raw" className="sr-only">Raw Content Editor</label>
            <Textarea
              id="chapter-content-editor-raw"
              ref={editorRef}
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="min-h-[60vh] lg:min-h-[70vh] font-mono text-base border-input focus:border-primary resize-y w-full bg-background"
              placeholder="Write your chapter content here..."
              disabled={saving}
              aria-label="Chapter Content Editor"
            />
          </div>
        )}

        {/* Preview Only View */}
        {viewMode === 'preview' && (
          <div className="w-full">
            <label className="sr-only">Preview</label>
            <Card className="flex-grow overflow-hidden bg-card text-card-foreground">
              <CardContent
                ref={previewRef}
                className="p-4 md:p-6 min-h-[60vh] lg:min-h-[70vh] overflow-y-auto prose prose-sm sm:prose-base max-w-none dark:prose-invert"
              >
                <DynamicText content={editedContent} isEnabled={effectsEnabledInPreview} />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Split View Mode */}
        {viewMode === 'split' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Editor Side */}
            <div className="w-full">
              <label htmlFor="chapter-content-editor-split" className="sr-only">Raw Content Editor</label>
              <Textarea
                id="chapter-content-editor-split"
                ref={editorRef}
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="min-h-[60vh] lg:min-h-[70vh] font-mono text-base border-input focus:border-primary resize-y w-full bg-background"
                placeholder="Write your chapter content here..."
                disabled={saving}
                aria-label="Chapter Content Editor"
              />
            </div>

            {/* Preview Side */}
            <Card className="flex-grow overflow-hidden bg-card text-card-foreground h-full">
              <CardContent
                ref={previewRef}
                className="p-4 md:p-6 min-h-[60vh] lg:min-h-[70vh] overflow-y-auto prose prose-sm sm:prose-base max-w-none dark:prose-invert"
              >
                <DynamicText content={editedContent} isEnabled={effectsEnabledInPreview} />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
