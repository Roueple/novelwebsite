// src/app/novels/[id]/chapter/[chapterId]/edit/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
// ... other imports remain the same
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Save, X, Lock, Unlock, Eye, EyeOff, HelpCircle, Sparkles } from 'lucide-react';
import TextEffectsToolbar from '@/components/editor/text-effects-toolbar'; // Keep this import
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


// --- >>>> REMOVE Explicit Type: React.FC <<<< ---
const EditChapterPage = () => {
// --- >>>> END CHANGE <<<< ---

  const { user, role } = useAuth();
  const params = useParams();
  const router = useRouter();
  const novelId = Number(params.id);
  const chapterNumber = Number(params.chapterId); // Use chapterNumber for consistency

  const [loading, setLoading] = useState(true);
  const [initialLoadError, setInitialLoadError] = useState<string | null>(null);
  const [chapter, setChapter] = useState<ChapterType | null>(null);
  const [novel, setNovel] = useState<NovelType | null>(null);

  // State for editor UI
  const [showPreview, setShowPreview] = useState(false);
  const [effectsEnabledInPreview, setEffectsEnabledInPreview] = useState(true);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null); // Ref for the textarea

  // Fetch Data (keep the useCallback version)
  const loadData = useCallback(async () => {
    setLoading(true);
    setInitialLoadError(null);
    if (isNaN(novelId) || isNaN(chapterNumber)) {
      setInitialLoadError('Invalid novel or chapter ID.');
      setLoading(false);
      toast.error('Invalid URL parameters.');
      return;
    }
    try {
      const [chapterData, novelData] = await Promise.all([
        getChapter(novelId, chapterNumber),
        getNovel(novelId) // Need novel data for author check
      ]);
      if (!novelData) throw new Error('Novel not found');
      if (!chapterData) throw new Error('Chapter not found');

      setNovel(novelData);
      setChapter(chapterData);
    } catch (error: any) {
      console.error('Error loading chapter data for edit:', error);
      setInitialLoadError(error.message || 'Failed to load chapter data.');
      toast.error(`Error: ${error.message || 'Failed to load chapter data.'}`);
    } finally {
      setLoading(false);
    }
  }, [novelId, chapterNumber]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Chapter Actions Hook
  const {
    isAuthor,
    isLocked,
    setIsLocked,
    editedTitle,
    setEditedTitle,
    editedContent,
    setEditedContent,
    saving,
    handleSave: performSave,
    handleLockToggle,
  } = useChapterActions(chapter, user, role, setChapter, novel);

  // Autosave Logic (keep the useEffect version)
  const autosaveKey = `chapter_draft_${novelId}_${chapter?.id ?? 'new'}`;
  useEffect(() => {
    // Load draft on mount
    try {
      const savedDraft = localStorage.getItem(autosaveKey);
      if (savedDraft && chapter) { // Only load if chapter data exists
        const { title, content, locked, timestamp } = JSON.parse(savedDraft);
        const draftDate = new Date(timestamp);
        // Make sure chapter.updated_at exists before comparing
        const chapterUpdateDate = chapter.updated_at ? new Date(chapter.updated_at) : new Date(0); // Default to epoch if undefined
        if (draftDate > chapterUpdateDate) {
          setEditedTitle(title);
          setEditedContent(content);
          setIsLocked(locked);
          setLastSavedTime(draftDate);
          toast.info("Draft loaded");
        }
      }
    } catch (e) { console.error("Failed to load draft", e); }
  }, [chapter, autosaveKey, setEditedTitle, setEditedContent, setIsLocked]); // Added missing dependencies

  useEffect(() => {
    if (!chapter) return; // Don't run autosave if chapter isn't loaded

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
    }, 3000);

    return () => clearTimeout(handler);
  }, [editedTitle, editedContent, isLocked, autosaveKey, chapter]); // Added chapter dependency

  const handleFinalSave = async () => {
    const success = await performSave(); // Check success
    if (success) {
        localStorage.removeItem(autosaveKey);
        // Optional: redirect back
        // router.push(`/novels/${novelId}/chapter/${chapterNumber}`);
    }
  };

  const handleCancel = () => {
    if (confirm("Discard unsaved changes and return to chapter?")) {
        localStorage.removeItem(autosaveKey); // Discard draft
        router.push(`/novels/${novelId}/chapter/${chapterNumber}`);
    }
  };

  // --- Loading and Error Handling ---
  if (loading) {
    return <LoadingScreen message="Loading chapter editor..." />;
  }
  if (initialLoadError) {
    return <NotFoundScreen message={initialLoadError} returnUrl={`/novels/${novelId || ''}`} returnText="Back to Novel" />;
  }
  // Ensure chapter/novel check happens *after* loading is false
  if (!chapter || !novel) {
    // Added check to prevent rendering potentially invalid state if loading finished but data is still null
    if (!initialLoadError){ // Only show this if there wasn't already a load error
        return <NotFoundScreen message="Chapter or Novel data could not be loaded for editing." returnUrl={`/novels/${novelId || ''}`} returnText="Back to Novel"/>;
    } else {
        // If initialLoadError exists, that screen is already shown.
        return null;
    }
  }

  // Render the editor within the AdminRoleCheck
  return (
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
              />
           </div>

          <div className="flex items-center flex-wrap gap-2">
            {lastSavedTime && (
              <span className="text-xs text-muted-foreground mr-2">
                Draft saved: {lastSavedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} {/* Nicer format */}
              </span>
            )}
            {/* Help Dialog Trigger */}
             <Dialog>
                <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                    <HelpCircle size={16} /> Help
                </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Text Effects Guide</DialogTitle>
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
                    className={`w-8 h-8 ${effectsEnabledInPreview ? 'text-yellow-500' : 'text-muted-foreground'}`}
                    aria-label={effectsEnabledInPreview ? 'Disable effects in preview' : 'Enable effects in preview'}
                  >
                   <Sparkles size={16} />
                 </Button>
            )}
            {/* Lock Toggle */}
             <Button
                variant="outline"
                size="sm"
                onClick={handleLockToggle}
                disabled={saving}
                className={`gap-1 ${isLocked ? 'text-red-600 border-red-600 hover:bg-red-50' : 'text-green-600 border-green-600 hover:bg-green-50'}`}
              >
                {isLocked ? <Lock size={16} /> : <Unlock size={16} />}
                {isLocked ? 'Locked' : 'Unlocked'}
             </Button>
             {/* Cancel Button */}
             <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}>
                <X size={16} className="mr-1"/> Cancel
              </Button>
            {/* Save Button */}
            <Button size="sm" onClick={handleFinalSave} disabled={saving} className="bg-red-600 hover:bg-red-700 text-white">
              <Save size={16} className="mr-1" />
              {saving ? 'Saving...' : 'Save Chapter'}
            </Button>
          </div>
        </div>

         {/* Editor Toolbar */}
         <TextEffectsToolbar
            editorRef={editorRef} // Pass the ref
            setContent={setEditedContent} // Pass the state setter
            disabled={saving}
         />

        {/* Main Editor Area */}
        <div className={`mt-4 grid gap-6 ${showPreview ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
          {/* Textarea Editor */}
          <div className="flex flex-col">
            <label htmlFor="chapter-content-editor" className="text-sm font-medium mb-1">Content Editor</label>
             <Textarea
                id="chapter-content-editor"
                ref={editorRef} // Assign ref
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="min-h-[60vh] font-mono text-base flex-grow border-input focus:border-primary" // Adjusted styling
                placeholder="Write your chapter content here. Use the toolbar or type tags like [shout]text[shout]..."
                disabled={saving}
            />
          </div>

          {/* Preview Panel (Conditional) */}
          {showPreview && (
            <div className="flex flex-col">
                 <label className="text-sm font-medium mb-1">Preview</label>
                <Card className="flex-grow overflow-hidden">
                    <CardContent className="p-4 min-h-[60vh] overflow-y-auto prose max-w-none">
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