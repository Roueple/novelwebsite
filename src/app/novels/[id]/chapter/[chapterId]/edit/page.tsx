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
import { getChapter, getNovel, updateChapter } from '@/lib/api';
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

  // --- Manual Lock Toggle Function ---
  const handleManualLockToggle = async () => {
    // Log before toggling
    console.log('Before toggle - isLocked:', isLocked);
    
    // Toggle the lock state directly
    const newLockedState = !isLocked;
    setIsLocked(newLockedState);
    
    // Show what we're trying to do
    toast.info(`Setting to ${newLockedState ? 'Locked' : 'Unlocked'}...`);
    
    // Use a timeout to ensure state is updated before we check
    setTimeout(() => {
      console.log('After immediate toggle - isLocked:', newLockedState);
    }, 10);
    
    // Now call the API to persist the change
    try {
      if (!chapter || !novel) {
        throw new Error("Missing chapter or novel data");
      }
      
      // Direct API call to verify
      const success = await updateChapter(novelId, chapter.id, {
        is_locked: newLockedState
      });
      
      if (success) {
        toast.success(`Chapter ${newLockedState ? 'locked' : 'unlocked'} successfully`);
        // Update chapter state
        setChapterState(prev => prev ? { ...prev, is_locked: newLockedState } : null);
      } else {
        // Revert on failure
        toast.error('Failed to update lock status');
        setIsLocked(!newLockedState); // Revert
      }
    } catch (err) {
      console.error('Error in lock toggle:', err);
      toast.error('Error toggling lock status');
      setIsLocked(!newLockedState); // Revert
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

  // --- Enhanced View Toggle with Scroll Sync ---
  const handleViewToggle = () => {
    // Capture scroll position before toggling state
    let currentScroll = 0;
    let scrollPercentage = 0;
    
    if (showRawEditor && editorRef.current) {
      const element = editorRef.current;
      currentScroll = element.scrollTop;
      // Calculate percentage scrolled for better cross-view sync
      scrollPercentage = element.scrollHeight > 0 
        ? currentScroll / (element.scrollHeight - element.clientHeight) 
        : 0;
    } else if (!showRawEditor && previewRef.current) {
      const element = previewRef.current;
      currentScroll = element.scrollTop;
      // Calculate percentage scrolled
      scrollPercentage = element.scrollHeight > 0 
        ? currentScroll / (element.scrollHeight - element.clientHeight) 
        : 0;
    }
    
    // Store both values
    setScrollPosition(currentScroll);
    setScrollPercentage(scrollPercentage);
    
    // Toggle the view
    setShowRawEditor(prev => !prev);
  };

  // Effect to restore scroll position using percentage approach
  useEffect(() => {
    if (loading) return;

    // Use a longer timeout to ensure content is fully rendered
    const timerId = setTimeout(() => {
      requestAnimationFrame(() => {
        // Determine which element is currently visible
        const targetElement = !showRawEditor ? previewRef.current : editorRef.current;
        
        if (targetElement) {
          // Apply scroll based on percentage
          const newScrollTop = scrollPercentage * 
            (targetElement.scrollHeight - targetElement.clientHeight);
          
          // Apply the calculated scroll position
          targetElement.scrollTop = newScrollTop;
          
          console.log(`Applied scroll: ${scrollPercentage.toFixed(2)}% → ${newScrollTop}px`);
        }
      });
    }, 100); // Increased timeout

    return () => clearTimeout(timerId);
  }, [showRawEditor, loading, scrollPercentage]);

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
                {/* Debug Button (Temporary) */}
                <Button
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    console.log('Current lock state:', {
                      componentIsLocked: isLocked,
                      chapterIsLocked: chapter?.is_locked,
                      mismatch: isLocked !== chapter?.is_locked
                    });
                  }}
                  className="text-xs"
                >
                  Debug Lock
                </Button>
                {/* Lock Toggle Button */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleManualLockToggle} 
                  disabled={saving} 
                  className={cn(
                    "gap-1", 
                    isLocked 
                      ? 'text-destructive border-destructive hover:bg-destructive/10' 
                      : 'text-green-600 border-green-600 hover:bg-green-500/10'
                  )} 
                  aria-pressed={isLocked}
                >
                  {isLocked ? <Lock size={16} /> : <Unlock size={16} />}
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