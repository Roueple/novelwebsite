// src/app/novels/[id]/chapter/[chapterId]/edit/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Save, X, Lock, Unlock, Eye, EyeOff, Sparkles, Code } from 'lucide-react';
import TextEffectsToolbar from '@/components/editor/text-effects-toolbar';
import DynamicText from '@/components/reading/dynamic-text';
import { toast } from 'sonner';
import type { ChapterType, NovelType } from '@/types/supabase';
import { useAuth } from '@/providers/auth-provider';
import { getChapter, getNovel } from '@/lib/api';
import LoadingScreen from '@/components/ui/loading-screen';
import NotFoundScreen from '@/components/ui/not-found-screen';
import AdminRoleCheck from '@/components/auth/admin-role-check';
import { useChapterActions } from '@/hooks/use-chapter-actions';
import { cn } from '@/lib/utils';

// Define heights for sticky elements (adjust as needed)
const TOP_BAR_HEIGHT = 'h-[76px]'; // Approx height for the top bar with title input
const TOOLBAR_OFFSET = 'top-[76px]'; // Position toolbar below the top bar

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
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // --- Fetch Data & Chapter Actions Hook (Logic Remains the Same) ---
  const loadData = useCallback(async () => {
    setLoading(true);
    setInitialLoadError(null);
    if (isNaN(novelId) || isNaN(chapterNumber)) {
      setInitialLoadError('Invalid novel or chapter ID.'); setLoading(false); toast.error('Invalid URL parameters.'); router.push('/'); return;
    }
    try {
      const [fetchedChapter, fetchedNovel] = await Promise.all([ getChapter(novelId, chapterNumber), getNovel(novelId) ]);
      if (!fetchedNovel) throw new Error('Novel not found');
      if (!fetchedChapter) throw new Error('Chapter not found');
      setNovel(fetchedNovel);
      setChapterState(fetchedChapter);
    } catch (error: any) {
      console.error('Error loading chapter data for edit:', error);
      const message = error.message || 'Failed to load chapter data.';
      setInitialLoadError(message); toast.error(`Error: ${message}`);
      if (message.includes('not found')) { router.push(`/novels/${novelId || ''}`); }
    } finally { setLoading(false); }
  }, [novelId, chapterNumber, router]);
  useEffect(() => { loadData(); }, [loadData]);

  const {
    isAuthor, isLocked, setIsLocked, editedTitle, setEditedTitle,
    editedContent, setEditedContent, saving, handleSave: performSave, handleLockToggle,
  } = useChapterActions(chapter, user, role, setChapterState, novel);

  // --- Autosave Logic (Remains the Same) ---
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
          setEditedTitle(title); setEditedContent(content); setIsLocked(locked);
          setLastSavedTime(draftDate);
        } else {
           setEditedTitle(chapter.title); setEditedContent(chapter.content || ''); setIsLocked(chapter.is_locked);
        }
      } else {
         setEditedTitle(chapter.title); setEditedContent(chapter.content || ''); setIsLocked(chapter.is_locked);
      }
    } catch (e) {
        console.error("Failed to load or parse draft", e);
        if(chapter) {
           setEditedTitle(chapter.title); setEditedContent(chapter.content || ''); setIsLocked(chapter.is_locked);
        }
    }
  }, [chapter, autosaveKey, setEditedTitle, setEditedContent, setIsLocked]);

  useEffect(() => {
     if (!chapter || loading) return;
     const handler = setTimeout(() => {
       try {
         localStorage.setItem(autosaveKey, JSON.stringify({ title: editedTitle, content: editedContent, locked: isLocked, timestamp: new Date().toISOString() }));
         setLastSavedTime(new Date());
       } catch (e) { console.error("Autosave failed", e); }
     }, 3000);
     return () => clearTimeout(handler);
   }, [editedTitle, editedContent, isLocked, autosaveKey, chapter, loading]);

  // --- Final Save & Cancel Actions (Remain the Same) ---
  const handleFinalSave = async () => {
    const success = await performSave();
    if (success) {
        localStorage.removeItem(autosaveKey);
        toast.success("Chapter saved successfully! Redirecting...");
        router.push(`/novels/${novelId}/chapter/${chapterNumber}`);
    }
  };
  const handleCancel = () => {
    const hasChanges = editedTitle !== chapter?.title || editedContent !== (chapter?.content || '') || isLocked !== chapter?.is_locked;
    if (hasChanges) {
        const discard = confirm("You have unsaved changes in this draft. Discard draft and return to chapter view?");
        if (!discard) return;
    }
    localStorage.removeItem(autosaveKey);
    router.push(`/novels/${novelId}/chapter/${chapterNumber}`);
  };

  // --- Loading and Error Handling (Logic Remains the Same) ---
  if (loading) return <LoadingScreen message="Loading chapter editor..." />;
  if (initialLoadError) return <NotFoundScreen message={initialLoadError} returnUrl={`/novels/${novelId || ''}`} returnText="Back to Novel" />;
  if (!chapter || !novel) return <NotFoundScreen message="Chapter or Novel data missing." returnUrl={`/novels/${novelId || ''}`} returnText="Back to Novel"/>;
  if (!isAuthor) return <NotFoundScreen message="You do not have permission to edit this chapter." returnUrl={`/novels/${novelId}/chapter/${chapterNumber}`} returnText="Back to Chapter"/>;

  // --- Render Editor ---
  return (
    <AdminRoleCheck allowAuthor={true}>
      {/* Use padding on the main container to account for fixed/sticky elements */}
      <div className="min-h-screen bg-background text-foreground p-4 md:p-8 pt-[140px]"> {/* Adjust pt value based on combined height of sticky bars */}

        {/* --- Sticky Top Control Bar --- */}
        <div className={cn(
            "fixed top-0 left-0 right-0 z-50 bg-background border-b border-border shadow-sm",
            "px-4 md:px-8 py-3", // Add padding
            TOP_BAR_HEIGHT // Define height for offset calculation
        )}>
          <div className="flex flex-wrap items-center justify-between gap-4">
             {/* Title Input Area */}
             <div className='flex flex-col flex-grow min-w-[200px]'> {/* Allow title to grow */}
               <h1 className="text-sm md:text-base font-semibold text-muted-foreground mb-1">Edit Chapter {chapter.chapter_number}</h1>
               <Input
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  placeholder="Chapter Title"
                  className="text-lg font-semibold h-10" // Adjust height/style
                  disabled={saving}
                  aria-label="Chapter Title"
               />
             </div>
             {/* Right Side Controls */}
             <div className="flex items-center flex-wrap gap-2 flex-shrink-0">
               {lastSavedTime && ( <span className="text-xs text-muted-foreground mr-2 hidden sm:inline" aria-live="polite"> Draft saved: {lastSavedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} </span> )}
               {/* Toggle Raw/Preview Button */}
               <Button variant="outline" size="sm" onClick={() => setShowRawEditor(!showRawEditor)} className="gap-1" aria-pressed={!showRawEditor} >
                 {showRawEditor ? <Eye size={16} /> : <Code size={16} />}
                 {showRawEditor ? 'Preview' : 'Raw Text'}
               </Button>
               {/* Effects Toggle (for Preview) */}
               {!showRawEditor && ( <Button variant="ghost" size="icon" onClick={() => setEffectsEnabledInPreview(!effectsEnabledInPreview)} className={cn("w-8 h-8", effectsEnabledInPreview ? 'text-yellow-500 hover:text-yellow-600' : 'text-muted-foreground hover:text-foreground')} aria-label={effectsEnabledInPreview ? 'Disable effects in preview' : 'Enable effects in preview'} aria-pressed={effectsEnabledInPreview} > <Sparkles size={16} /> </Button> )}
               {/* Lock Toggle Button */}
               <Button variant="outline" size="sm" onClick={handleLockToggle} disabled={saving} className={cn("gap-1", isLocked ? 'text-destructive border-destructive hover:bg-destructive/10' : 'text-green-600 border-green-600 hover:bg-green-500/10')} aria-pressed={isLocked} > {isLocked ? <Lock size={16} /> : <Unlock size={16} />} {isLocked ? 'Locked' : 'Unlocked'} </Button>
               {/* Cancel Button */}
               <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}> <X size={16} className="mr-1"/> Cancel </Button>
               {/* Save Button */}
               <Button size="sm" onClick={handleFinalSave} disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground"> <Save size={16} className="mr-1" /> {saving ? 'Saving...' : 'Save Chapter'} </Button>
             </div>
          </div>
        </div>

         {/* --- Sticky Text Effects Toolbar --- */}
         <div className={cn(
             "sticky z-40 bg-background py-2", // Ensure background for overlap
             TOOLBAR_OFFSET // Position below the top bar
         )}>
            <TextEffectsToolbar
                editorRef={editorRef}
                setContent={setEditedContent}
                // Disable toolbar buttons if preview is showing OR if saving
                disabled={!showRawEditor || saving}
            />
         </div>

        {/* Main Editor Area - Conditional Views */}
        {/* Removed margin-top as padding is handled by the main container */}
        <div className="mt-4"> {/* Add some space below the sticky toolbar */}
          {/* Raw Text Editor (Shown by default) */}
          <div className={cn({ 'hidden': !showRawEditor })}>
            <label htmlFor="chapter-content-editor" className="sr-only">Raw Content Editor</label>
            <Textarea
                id="chapter-content-editor"
                ref={editorRef}
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="min-h-[60vh] lg:min-h-[70vh] font-mono text-base border-input focus:border-primary resize-y w-full bg-background" // Ensure background matches
                placeholder="Write your chapter content here..."
                disabled={saving}
                aria-label="Chapter Content Editor"
            />
          </div>
          {/* Preview Panel (Hidden by default) */}
          <div className={cn({ 'hidden': showRawEditor })}>
             <label className="sr-only">Preview</label>
             {/* Use Card for consistent styling, ensure background matches theme */}
             <Card className="flex-grow overflow-hidden bg-card text-card-foreground">
                <CardContent className="p-4 md:p-6 min-h-[60vh] lg:min-h-[70vh] overflow-y-auto prose prose-sm sm:prose-base max-w-none dark:prose-invert">
                    {/* Pass effectsEnabledInPreview to DynamicText */}
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