// src/app/novels/[id]/chapter/[chapterId]/edit/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Save, X, Lock, Unlock, Eye, EyeOff, Sparkles, 
  Code, SparklesIcon, Trash2, ChevronUp, ChevronDown,
  SplitSquareVertical
} from 'lucide-react';
import TextEffectsToolbar from '@/components/editor/text-effects-toolbar';
import DynamicText from '@/components/reading/dynamic-text';
import { toast } from 'sonner';
import type { ChapterType, NovelType } from '@/types/supabase';
import { useAuth } from '@/providers/auth-provider';
import { getChapter, getNovel } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import LoadingScreen from '@/components/ui/loading-screen';
import NotFoundScreen from '@/components/ui/not-found-screen';
import AdminRoleCheck from '@/components/auth/admin-role-check';
import { useChapterActions } from '@/hooks/use-chapter-actions';
import { cn } from '@/lib/utils';

const EditChapterPage = () => {
  const { user, role } = useAuth();
  const params = useParams();
  const router = useRouter();
  const novelId = Number(params.id);
  const chapterNumber = Number(params.chapterId);

  const [loading, setLoading] = useState(true);
  const [initialLoadError, setInitialLoadError] = useState<string | null>(null);
  const [chapter, setChapterState] = useState<ChapterType | null>(null);
  const [novel, setNovel] = useState<NovelType | null>(null);

  // View state
  const [viewMode, setViewMode] = useState<'raw' | 'preview' | 'split'>('raw');
  const [effectsEnabledInPreview, setEffectsEnabledInPreview] = useState(true);
  const [headerVisible, setHeaderVisible] = useState(true);
  
  // Editor state
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const [lockToggleInProgress, setLockToggleInProgress] = useState(false);

  // Refs
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // --- Fetch Data & Chapter Actions Hook ---
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

  const {
    isAuthor,
    isLocked,
    setIsLocked,
    editedTitle,
    setEditedTitle,
    editedContent,
    setEditedContent,
    saving,
    handleSave: performSave
  } = useChapterActions(chapter, user, role, setChapterState, novel);

  // --- Direct Lock Toggle Function ---
  const directLockToggle = async () => {
    if (!chapter || !novel || lockToggleInProgress) return;
    
    try {
      setLockToggleInProgress(true);
      
      // Define the target state (opposite of current)
      const targetLockedState = !isLocked;
      
      // Show visual feedback immediately
      setIsLocked(targetLockedState);
      toast.info(`Setting chapter to ${targetLockedState ? 'locked' : 'unlocked'}...`);
      
      // Call Supabase directly instead of using the API layer
      const { error } = await supabase
        .from('chapters')
        .update({
          is_locked: targetLockedState
        })
        .eq('id', chapter.id)
        .eq('novel_id', novel.id);
      
      if (error) {
        console.error('Supabase error during lock toggle:', error);
        toast.error(`Lock toggle failed: ${error.message}`);
        // Revert UI
        setIsLocked(!targetLockedState);
        return;
      }
      
      // Success! Update both the visual state and chapter object
      toast.success(`Chapter is now ${targetLockedState ? 'locked' : 'unlocked'}`);
      setChapterState(prev => prev ? { ...prev, is_locked: targetLockedState } : null);
      
    } catch (err) {
      console.error('Exception during lock toggle:', err);
      toast.error('An unexpected error occurred');
      // Revert UI on exception
      setIsLocked(!isLocked);
    } finally {
      setLockToggleInProgress(false);
    }
  };

  // --- Autosave Logic ---
  const autosaveKey = `chapter_draft_${novelId}_${chapter?.id ?? 'new'}`;
  
  useEffect(() => {
    if (!chapter) return;
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
        } else {
          setEditedTitle(chapter.title);
          setEditedContent(chapter.content || '');
          setIsLocked(chapter.is_locked);
        }
      } else {
        setEditedTitle(chapter.title);
        setEditedContent(chapter.content || '');
        setIsLocked(chapter.is_locked);
      }
    } catch (e) {
      console.error("Failed to load or parse draft", e);
      if (chapter) {
        setEditedTitle(chapter.title);
        setEditedContent(chapter.content || '');
        setIsLocked(chapter.is_locked);
      }
    }
  }, [chapter, autosaveKey, setEditedTitle, setEditedContent, setIsLocked]);

  useEffect(() => {
    if (!chapter || loading) return;
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
    }, 3000);
    return () => clearTimeout(handler);
  }, [editedTitle, editedContent, isLocked, autosaveKey, chapter, loading]);

  // --- Scroll Synchronization ---
  const synchronizeScroll = (sourceElement: HTMLElement) => {
    if (!sourceElement) return;
    
    let targetElement: HTMLElement | null = null;
    
    // Determine which element to sync to based on which one triggered the scroll
    if (sourceElement === editorRef.current && previewRef.current) {
      targetElement = previewRef.current;
    } else if (sourceElement === previewRef.current && editorRef.current) {
      targetElement = editorRef.current;
    }
    
    if (!targetElement) return;
    
    // Calculate and apply the scroll percentage
    const sourceScrollMax = sourceElement.scrollHeight - sourceElement.clientHeight;
    const targetScrollMax = targetElement.scrollHeight - targetElement.clientHeight;
    
    if (sourceScrollMax <= 0 || targetScrollMax <= 0) return;
    
    const scrollPercentage = sourceElement.scrollTop / sourceScrollMax;
    targetElement.scrollTop = scrollPercentage * targetScrollMax;
  };

  // Attach scroll event listeners
  useEffect(() => {
    if (loading || viewMode !== 'split') return;
    
    // Only set up scroll sync for split view mode
    const editorElement = editorRef.current;
    const previewElement = previewRef.current;
    
    if (!editorElement || !previewElement) return;
    
    const handleEditorScroll = () => synchronizeScroll(editorElement);
    const handlePreviewScroll = () => synchronizeScroll(previewElement);
    
    // Set a flag to prevent recursive scroll events
    let isScrolling = false;
    
    const wrappedEditorScroll = () => {
      if (isScrolling) return;
      isScrolling = true;
      handleEditorScroll();
      setTimeout(() => { isScrolling = false; }, 50);
    };
    
    const wrappedPreviewScroll = () => {
      if (isScrolling) return;
      isScrolling = true;
      handlePreviewScroll();
      setTimeout(() => { isScrolling = false; }, 50);
    };
    
    editorElement.addEventListener('scroll', wrappedEditorScroll);
    previewElement.addEventListener('scroll', wrappedPreviewScroll);
    
    return () => {
      editorElement.removeEventListener('scroll', wrappedEditorScroll);
      previewElement.removeEventListener('scroll', wrappedPreviewScroll);
    };
  }, [loading, viewMode]);

  // --- View Mode Cycling ---
  const cycleViewMode = () => {
    setViewMode(current => {
      // Cycle through modes: raw -> preview -> split -> raw
      if (current === 'raw') return 'preview';
      if (current === 'preview') return 'split';
      return 'raw';
    });
  };

  // --- Remove All Effects ---
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

  // --- Final Save & Cancel Actions ---
  const handleFinalSave = async () => {
    const success = await performSave();
    if (success) {
      localStorage.removeItem(autosaveKey);
      toast.success("Chapter saved successfully! Redirecting...");
      router.push(`/novels/${novelId}/chapter/${chapterNumber}`);
    }
  };
  
  const handleCancel = () => {
    const hasChanges = editedTitle !== chapter?.title || 
      editedContent !== (chapter?.content || '') || 
      isLocked !== chapter?.is_locked;
      
    if (hasChanges) {
      const discard = confirm("You have unsaved changes in this draft. Discard draft and return to chapter view?");
      if (!discard) return;
    }
    localStorage.removeItem(autosaveKey);
    router.push(`/novels/${novelId}/chapter/${chapterNumber}`);
  };

  // --- Loading and Error Handling ---
  if (loading) return <LoadingScreen message="Loading chapter editor..." />;
  if (initialLoadError) return <NotFoundScreen message={initialLoadError} returnUrl={`/novels/${novelId || ''}`} returnText="Back to Novel" />;
  if (!chapter || !novel) return <NotFoundScreen message="Chapter or Novel data missing." returnUrl={`/novels/${novelId || ''}`} returnText="Back to Novel"/>;
  if (!isAuthor) return <NotFoundScreen message="You do not have permission to edit this chapter." returnUrl={`/novels/${novelId}/chapter/${chapterNumber}`} returnText="Back to Chapter"/>;

  // --- Render Editor ---
  return (
    <AdminRoleCheck allowAuthor={true}>
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
                    onClick={directLockToggle} 
                    disabled={saving || lockToggleInProgress} 
                    className={cn(
                      "gap-1", 
                      isLocked 
                        ? 'text-destructive border-destructive hover:bg-destructive/10' 
                        : 'text-green-600 border-green-600 hover:bg-green-500/10'
                    )}
                  >
                    {lockToggleInProgress ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
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
                  <Button size="sm" onClick={handleFinalSave} disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground">
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
              disabled={saving}
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
    </AdminRoleCheck>
  );
};

export default EditChapterPage;