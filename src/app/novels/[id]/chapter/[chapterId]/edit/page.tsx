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
  Code, SparklesIcon, Trash2, ChevronUp, ChevronDown 
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

  const [showRawEditor, setShowRawEditor] = useState(true);
  const [effectsEnabledInPreview, setEffectsEnabledInPreview] = useState(true);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [scrollPercentage, setScrollPercentage] = useState(0);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [lockToggleInProgress, setLockToggleInProgress] = useState(false);

  // Scroll sync state
  const [isScrolling, setIsScrolling] = useState(false);
  const [activeScrollElement, setActiveScrollElement] = useState<'editor' | 'preview' | null>(null);
  const attemptedSyncRef = useRef(0);
  const maxSyncAttempts = 5;

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
  // Specialized function for scroll synchronization
  const syncScroll = (sourceType: 'editor' | 'preview', percentage: number) => {
    // If already synchronizing from the other element, don't create infinite loop
    if (isScrolling && activeScrollElement !== sourceType) {
      return;
    }
    
    setIsScrolling(true);
    setActiveScrollElement(sourceType);
    
    // Reset attempts counter when initiating a new sync
    attemptedSyncRef.current = 0;
    
    // Define which element to sync to
    const targetElement = sourceType === 'editor' ? previewRef.current : editorRef.current;
    
    // Attempt to apply scroll
    const tryApplyScroll = () => {
      if (!targetElement || attemptedSyncRef.current >= maxSyncAttempts) {
        // Give up after max attempts
        setIsScrolling(false);
        setActiveScrollElement(null);
        return;
      }
      
      attemptedSyncRef.current += 1;
      
      // Get the target's maximum scroll range
      const maxScroll = targetElement.scrollHeight - targetElement.clientHeight;
      
      // Apply the percentage
      if (maxScroll > 0) {
        const targetPosition = percentage * maxScroll;
        targetElement.scrollTop = targetPosition;
        
        // Check if we got close enough (within 5 pixels)
        const appliedPosition = targetElement.scrollTop;
        const difference = Math.abs(appliedPosition - targetPosition);
        
        if (difference <= 5) {
          // Success! We're done.
          setIsScrolling(false);
          setActiveScrollElement(null);
        } else {
          // Try again after a short delay
          setTimeout(tryApplyScroll, 50);
        }
      } else {
        // No scroll needed if there's nothing to scroll
        setIsScrolling(false);
        setActiveScrollElement(null);
      }
    };
    
    // Start the attempt process
    tryApplyScroll();
  };

  // Add scroll event listeners
  useEffect(() => {
    if (loading) return;
    
    const handleEditorScroll = () => {
      if (isScrolling && activeScrollElement !== 'editor') return;
      
      if (editorRef.current) {
        const element = editorRef.current;
        const maxScroll = element.scrollHeight - element.clientHeight;
        if (maxScroll <= 0) return; // No scrolling possible
        
        const percentage = element.scrollTop / maxScroll;
        syncScroll('editor', percentage);
      }
    };
    
    const handlePreviewScroll = () => {
      if (isScrolling && activeScrollElement !== 'preview') return;
      
      if (previewRef.current) {
        const element = previewRef.current;
        const maxScroll = element.scrollHeight - element.clientHeight;
        if (maxScroll <= 0) return; // No scrolling possible
        
        const percentage = element.scrollTop / maxScroll;
        syncScroll('preview', percentage);
      }
    };
    
    // Attach event listeners
    const editorElement = editorRef.current;
    const previewElement = previewRef.current;
    
    if (editorElement) {
      editorElement.addEventListener('scroll', handleEditorScroll);
    }
    
    if (previewElement) {
      previewElement.addEventListener('scroll', handlePreviewScroll);
    }
    
    // Initial sync after elements are fully rendered
    // Set a timeout to ensure content is rendered
    const initialSyncTimer = setTimeout(() => {
      // Initialize based on which view is active
      if (showRawEditor && editorRef.current) {
        const element = editorRef.current;
        const maxScroll = element.scrollHeight - element.clientHeight;
        if (maxScroll > 0) {
          // Use stored scrollPercentage from previous toggle if available
          const percentage = scrollPercentage > 0 ? scrollPercentage : 0;
          element.scrollTop = percentage * maxScroll;
        }
      } else if (!showRawEditor && previewRef.current) {
        const element = previewRef.current;
        const maxScroll = element.scrollHeight - element.clientHeight;
        if (maxScroll > 0) {
          const percentage = scrollPercentage > 0 ? scrollPercentage : 0;
          element.scrollTop = percentage * maxScroll;
        }
      }
    }, 150);
    
    // Cleanup
    return () => {
      if (editorElement) {
        editorElement.removeEventListener('scroll', handleEditorScroll);
      }
      
      if (previewElement) {
        previewElement.removeEventListener('scroll', handlePreviewScroll);
      }
      
      clearTimeout(initialSyncTimer);
    };
  }, [loading, showRawEditor, isScrolling, activeScrollElement, scrollPercentage]);

  // --- Handle View Toggle ---
  const handleViewToggle = () => {
    // Capture the scroll percentage from the active view
    if (showRawEditor && editorRef.current) {
      const element = editorRef.current;
      const maxScroll = element.scrollHeight - element.clientHeight;
      if (maxScroll > 0) {
        const percentage = element.scrollTop / maxScroll;
        setScrollPercentage(percentage);
      }
    } else if (!showRawEditor && previewRef.current) {
      const element = previewRef.current;
      const maxScroll = element.scrollHeight - element.clientHeight;
      if (maxScroll > 0) {
        const percentage = element.scrollTop / maxScroll;
        setScrollPercentage(percentage);
      }
    }
    
    // Toggle the view - the effect hook will handle initializing
    // the scroll position for the newly active view
    setShowRawEditor(prev => !prev);
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
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Title Input Area */}
              <div className='flex flex-col flex-grow min-w-[200px]'>
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
              
              {/* Right Side Controls */}
              <div className="flex items-center flex-wrap gap-2 flex-shrink-0">
                {lastSavedTime && (
                  <span className="text-xs text-muted-foreground mr-2 hidden sm:inline" aria-live="polite">
                    Draft saved: {lastSavedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
                
                {/* Hide Header Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setHeaderVisible(false)}
                  className="gap-1"
                  title="Hide header"
                >
                  <ChevronUp size={16} />
                  <span className="hidden sm:inline">Hide</span>
                </Button>
                
                {/* Raw/Preview Toggle Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleViewToggle}
                  className="gap-1"
                  aria-pressed={!showRawEditor}
                >
                  {showRawEditor ? <Eye size={16} /> : <Code size={16} />}
                  {showRawEditor ? 'Preview' : 'Raw Text'}
                </Button>
                
                {/* Effects Toggle (for Preview) */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEffectsEnabledInPreview(!effectsEnabledInPreview)}
                  className={cn(
                    "w-8 h-8",
                    effectsEnabledInPreview ? 'text-yellow-500 hover:text-yellow-600' : 'text-muted-foreground hover:text-foreground',
                    { 'invisible': showRawEditor }
                  )}
                  aria-label={effectsEnabledInPreview ? 'Disable effects in preview' : 'Enable effects in preview'}
                  aria-pressed={effectsEnabledInPreview}
                  disabled={showRawEditor || saving}
                  tabIndex={showRawEditor ? -1 : 0}
                >
                  <SparklesIcon size={16} />
                </Button>
                
                {/* Remove All Effects Button */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleRemoveAllEffects}
                  disabled={saving || !showRawEditor}
                  className="w-8 h-8 text-destructive hover:bg-destructive/10 disabled:opacity-50"
                  aria-label="Remove all text effects"
                  title="Remove all text effects"
                >
                  <Trash2 size={16} />
                </Button>
                
                {/* Lock Toggle Button */}
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
                    // Show loading spinner during the operation
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : isLocked ? (
                    <Lock size={16} />
                  ) : (
                    <Unlock size={16} />
                  )}
                  {isLocked ? 'Locked' : 'Unlocked'}
                </Button>
                
                {/* Cancel Button */}
                <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}>
                  <X size={16} className="mr-1"/> Cancel
                </Button>
                
                {/* Save Button */}
                <Button size="sm" onClick={handleFinalSave} disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Save size={16} className="mr-1" /> {saving ? 'Saving...' : 'Save Chapter'}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          // Show Header Button when header is hidden
          <div className="fixed top-0 left-0 p-2 z-30">
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

        {/* Text Effects Toolbar */}
        <div className={cn(
          "relative bg-background py-2 mb-4",
          headerVisible ? "" : "hidden" 
        )}>
          <TextEffectsToolbar
            editorRef={editorRef}
            setContent={setEditedContent}
            disabled={!showRawEditor || saving}
          />
        </div>

        {/* Main Editor Area - Conditional Views */}
        <div className="mt-4">
          {/* Raw Text Editor */}
          <div className={cn({ 'hidden': !showRawEditor })}>
            <label htmlFor="chapter-content-editor" className="sr-only">Raw Content Editor</label>
            <Textarea
              id="chapter-content-editor"
              ref={editorRef}
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="min-h-[60vh] lg:min-h-[70vh] font-mono text-base border-input focus:border-primary resize-y w-full bg-background"
              placeholder="Write your chapter content here..."
              disabled={saving}
              aria-label="Chapter Content Editor"
            />
          </div>
          {/* Preview Panel */}
          <div className={cn({ 'hidden': showRawEditor })}>
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
        </div>
      </div>
    </AdminRoleCheck>
  );
};

export default EditChapterPage;