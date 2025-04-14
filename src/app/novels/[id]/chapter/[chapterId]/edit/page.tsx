// src/app/novels/[id]/chapter/[chapterId]/edit/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Save, X, Lock, Unlock, Eye, EyeOff, HelpCircle, Sparkles } from 'lucide-react';
import TextEffectsToolbar from '@/components/editor/text-effects-toolbar';
import DynamicText from '@/components/reading/dynamic-text';
import TextEffectsExample from '@/components/reading/text-effects-example';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { ChapterType, NovelType } from '@/types/supabase';
import { useAuth } from '@/providers/auth-provider';
import { getChapter, getNovel } from '@/lib/api';
import LoadingScreen from '@/components/ui/loading-screen';
import NotFoundScreen from '@/components/ui/not-found-screen';
import AdminRoleCheck from '@/components/auth/admin-role-check';
import { useChapterActions } from '@/hooks/use-chapter-actions';
import { cn } from '@/lib/utils'; // Import cn

const EditChapterPage = () => {
  const { user, role } = useAuth();
  const params = useParams();
  const router = useRouter();
  const novelId = Number(params.id);
  const chapterNumber = Number(params.chapterId);

  const [loading, setLoading] = useState(true);
  const [initialLoadError, setInitialLoadError] = useState<string | null>(null);
  const [chapter, setChapterState] = useState<ChapterType | null>(null); // Renamed to avoid conflict with hook's chapter
  const [novel, setNovel] = useState<NovelType | null>(null);

  // State for editor UI
  const [showPreview, setShowPreview] = useState(false);
  const [effectsEnabledInPreview, setEffectsEnabledInPreview] = useState(true);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Fetch Data
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
      setChapterState(fetchedChapter); // Use the state setter

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

  // Chapter Actions Hook - Pass the state setter correctly
  const {
    isAuthor, // Use this to gate access within AdminRoleCheck effectively
    isLocked,
    setIsLocked, // Get setter from hook
    editedTitle,
    setEditedTitle,
    editedContent,
    setEditedContent,
    saving,
    handleSave: performSave,
    handleLockToggle,
  } = useChapterActions(chapter, user, role, setChapterState, novel); // Pass setChapterState

  // Autosave Logic
  const autosaveKey = `chapter_draft_${novelId}_${chapter?.id ?? 'new'}`;
  useEffect(() => {
    // Load draft on mount only if chapter data exists
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
          setIsLocked(locked); // Update lock state from draft
          setLastSavedTime(draftDate);
          toast.info("Draft loaded from previous session");
        }
      } else {
         // If no draft, initialize from chapter data
         setEditedTitle(chapter.title);
         setEditedContent(chapter.content || '');
         setIsLocked(chapter.is_locked);
      }
    } catch (e) { console.error("Failed to load draft", e); }
  }, [chapter, autosaveKey]); // Depend only on chapter and key

   // Autosave trigger
   useEffect(() => {
     if (!chapter || loading) return; // Don't autosave if loading or no chapter

     const handler = setTimeout(() => {
       try {
         localStorage.setItem(autosaveKey, JSON.stringify({
           title: editedTitle,
           content: editedContent,
           locked: isLocked,
           timestamp: new Date().toISOString()
         }));
         setLastSavedTime(new Date());
       } catch (e) { console.error("Autosave failed", e); }
     }, 3000); // Autosave every 3 seconds

     return () => clearTimeout(handler);
   }, [editedTitle, editedContent, isLocked, autosaveKey, chapter, loading]); // Added loading dependency

  // Final Save Action
  const handleFinalSave = async () => {
    const success = await performSave();
    if (success) {
        localStorage.removeItem(autosaveKey);
        toast.success("Chapter saved successfully!");
        // Consider staying on the edit page after save, or provide clear navigation options
        // router.push(`/novels/${novelId}/chapter/${chapterNumber}`);
    }
  };

  // Cancel Action
  const handleCancel = () => {
    // Compare current state with initial chapter state (if needed)
    const hasChanges = editedTitle !== chapter?.title || editedContent !== (chapter?.content || '') || isLocked !== chapter?.is_locked;

    if (hasChanges && !confirm("You have unsaved changes. Discard draft and return to chapter view?")) {
        return; // User cancelled the discard action
    }
    localStorage.removeItem(autosaveKey); // Discard draft
    router.push(`/novels/${novelId}/chapter/${chapterNumber}`);
  };


  // --- Loading and Error Handling ---
  if (loading) {
    return <LoadingScreen message="Loading chapter editor..." />;
  }
  if (initialLoadError) {
    return <NotFoundScreen message={initialLoadError} returnUrl={`/novels/${novelId || ''}`} returnText="Back to Novel" />;
  }
  if (!chapter || !novel) {
    // This state should ideally be covered by loading/error states, but safeguard
    return <NotFoundScreen message="Chapter or Novel data missing." returnUrl={`/novels/${novelId || ''}`} returnText="Back to Novel"/>;
  }

   // --- Authorization Check ---
   // Although AdminRoleCheck wraps, we use isAuthor from the hook which is derived
   // from fetched novel data for accuracy specific to *this* novel.
   if (!isAuthor) {
       return <NotFoundScreen message="You do not have permission to edit this chapter." returnUrl={`/novels/${novelId}/chapter/${chapterNumber}`} returnText="Back to Chapter"/>;
   }

  // Render the editor
  return (
    // AdminRoleCheck ensures only admins/authors reach this point initially
    <AdminRoleCheck allowAuthor={true}>
      <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
        {/* Editor Header Controls */}
        <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
           <div className='flex flex-col'>
             <h1 className="text-xl md:text-2xl font-bold text-foreground">Edit Chapter {chapter.chapter_number}</h1>
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                placeholder="Chapter Title"
                className="text-lg font-semibold mt-1 w-full max-w-md"
                disabled={saving}
                aria-label="Chapter Title"
              />
           </div>

          <div className="flex items-center flex-wrap gap-2">
            {lastSavedTime && (
              <span className="text-xs text-muted-foreground mr-2" aria-live="polite">
                Draft saved: {lastSavedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
            {/* Help Dialog Trigger */}
             <Dialog>
                <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                    <HelpCircle size={16} /> Help
                </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-background text-foreground border border-border">
                <DialogHeader>
                    <DialogTitle className="text-foreground">Text Effects Guide</DialogTitle>
                </DialogHeader>
                <TextEffectsExample />
                </DialogContent>
            </Dialog>
            {/* Preview Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              className="gap-1"
              aria-pressed={showPreview}
            >
              {showPreview ? <EyeOff size={16} /> : <Eye size={16} />}
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </Button>
            {/* Effects Toggle for Preview */}
            {showPreview && (
                 <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEffectsEnabledInPreview(!effectsEnabledInPreview)}
                    className={cn(
                        "w-8 h-8",
                        effectsEnabledInPreview ? 'text-yellow-500 hover:text-yellow-600' : 'text-muted-foreground hover:text-foreground'
                    )}
                    aria-label={effectsEnabledInPreview ? 'Disable effects in preview' : 'Enable effects in preview'}
                    aria-pressed={effectsEnabledInPreview}
                  >
                   <Sparkles size={16} />
                 </Button>
            )}
            {/* Lock Toggle */}
             <Button
                variant="outline"
                size="sm"
                onClick={handleLockToggle} // Use function from hook
                disabled={saving} // Disable while any save is in progress
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
              <Save size={16} className="mr-1" />
              {saving ? 'Saving...' : 'Save Chapter'}
            </Button>
          </div>
        </div>

         {/* Editor Toolbar */}
         <TextEffectsToolbar
            editorRef={editorRef}
            setContent={setEditedContent}
            disabled={saving || showPreview} // Disable toolbar in preview mode too
         />

        {/* Main Editor Area */}
        <div className={cn(
            "mt-4 grid gap-6",
            showPreview ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'
        )}>
          {/* Textarea Editor (Always visible) */}
          <div className={cn("flex flex-col", { 'hidden md:flex': showPreview })}> {/* Hide on small screens in preview */}
            <label htmlFor="chapter-content-editor" className="text-sm font-medium mb-1 sr-only">Content Editor</label>
             <Textarea
                id="chapter-content-editor"
                ref={editorRef}
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="min-h-[60vh] lg:min-h-[70vh] font-mono text-base flex-grow border-input focus:border-primary resize-y" // Allow vertical resize
                placeholder="Write your chapter content here. Use the toolbar or type tags like [shout]text[shout]..."
                disabled={saving}
                aria-label="Chapter Content Editor"
            />
          </div>

          {/* Preview Panel (Conditional) */}
          {showPreview && (
            <div className="flex flex-col">
                 <label className="text-sm font-medium mb-1 sr-only">Preview</label>
                <Card className="flex-grow overflow-hidden">
                    <CardContent className="p-4 md:p-6 min-h-[60vh] lg:min-h-[70vh] overflow-y-auto prose max-w-none bg-card text-card-foreground">
                        {/* Apply reading theme context if necessary, or ensure globals handle it */}
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