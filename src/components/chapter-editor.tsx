// src/components/chapter-editor.tsx
import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Sparkles, Save, Eye, EyeOff, HelpCircle } from 'lucide-react';
import DynamicText from '@/components/reading/dynamic-text';
import TextEffectsExample from '@/components/reading/text-effects-example';

interface ChapterEditorProps {
  chapterId?: number;
  novelId: number;
  initialTitle: string;
  initialContent: string;
  isLocked: boolean;
  onSave: (title: string, content: string, isLocked: boolean) => Promise<void>;
  onCancel: () => void;
}

export default function ChapterEditor({
  chapterId,
  novelId,
  initialTitle,
  initialContent,
  isLocked,
  onSave,
  onCancel
}: ChapterEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [locked, setLocked] = useState(isLocked);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [effectsEnabled, setEffectsEnabled] = useState(true);
  const [autoSaveId, setAutoSaveId] = useState<NodeJS.Timeout | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Set up autosave
  useEffect(() => {
    // Clear previous autosave interval when component unmounts
    return () => {
      if (autoSaveId) {
        clearTimeout(autoSaveId);
      }
    };
  }, [autoSaveId]);

  // Autosave function
  const autoSave = () => {
    const key = chapterId 
      ? `chapter_draft_${novelId}_${chapterId}` 
      : `chapter_new_draft_${novelId}`;
    
    try {
      localStorage.setItem(key, JSON.stringify({
        title,
        content,
        locked,
        timestamp: new Date().toISOString()
      }));
      setLastSaved(new Date());
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  };

  // Set up autosave timer when content changes
  useEffect(() => {
    if (autoSaveId) {
      clearTimeout(autoSaveId);
    }
    
    const id = setTimeout(() => {
      autoSave();
    }, 3000);
    
    setAutoSaveId(id);
    
    return () => {
      clearTimeout(id);
    };
  }, [title, content, locked]);

  // Load autosaved draft on mount
  useEffect(() => {
    const key = chapterId 
      ? `chapter_draft_${novelId}_${chapterId}` 
      : `chapter_new_draft_${novelId}`;
    
    try {
      const savedDraft = localStorage.getItem(key);
      if (savedDraft) {
        const { title: savedTitle, content: savedContent, locked: savedLocked, timestamp } = JSON.parse(savedDraft);
        
        // Only use the draft if it's newer than the initial data
        // This prevents old drafts from overwriting newer server data
        const isDraftNewer = !initialContent || (new Date(timestamp) > new Date(Date.now() - 86400000)); // Within last 24 hours
        
        if (isDraftNewer) {
          setTitle(savedTitle);
          setContent(savedContent);
          setLocked(savedLocked);
          setLastSaved(new Date(timestamp));
        }
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  }, [chapterId, novelId, initialTitle, initialContent]);

  // Handle form submission
  const handleSave = async () => {
    if (!title.trim()) {
      alert('Please enter a chapter title');
      return;
    }
    
    setSaving(true);
    
    try {
      await onSave(title, content, locked);
      
      // Clear draft after successful save
      const key = chapterId 
        ? `chapter_draft_${novelId}_${chapterId}` 
        : `chapter_new_draft_${novelId}`;
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error saving chapter:', error);
      alert('Failed to save chapter. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex-1">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Chapter Title"
            className="text-xl font-bold"
          />
        </div>
        
        <div className="flex items-center gap-2 ml-4">
          {lastSaved && (
            <span className="text-xs text-theme-muted">
              Last saved: {lastSaved.toLocaleTimeString()}
            </span>
          )}
          
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <HelpCircle size={16} />
                <span>Help</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-background text-foreground border border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground">Text Effects Guide</DialogTitle>
              </DialogHeader>
              <TextEffectsExample />
            </DialogContent>
          </Dialog>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="gap-2"
          >
            {showPreview ? (
              <>
                <EyeOff size={16} />
                <span>Edit</span>
              </>
            ) : (
              <>
                <Eye size={16} />
                <span>Preview</span>
              </>
            )}
          </Button>
          
          <div className="flex items-center gap-1">
            <Sparkles size={16} className={effectsEnabled ? 'text-yellow-500' : 'text-gray-400'} />
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={effectsEnabled}
                onChange={() => setEffectsEnabled(!effectsEnabled)}
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      <div className="mb-4 flex items-center">
        <label className="inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={locked}
            onChange={() => setLocked(!locked)}
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-red-600"></div>
          <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">
            {locked ? 'Premium Chapter (Locked)' : 'Free Chapter (Unlocked)'}
          </span>
        </label>
      </div>

      {showPreview ? (
        <Card>
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold mb-4">{title}</h2>
            <div className="prose max-w-none">
              <DynamicText content={content} isEnabled={effectsEnabled} />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="content" className="w-full">
          <TabsList>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="split">Split View</TabsTrigger>
          </TabsList>
          
          <TabsContent value="content" className="pt-4">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[60vh] font-mono text-base"
              placeholder="Write your chapter content here. Use [effect]text[effect] to add dynamic text effects. Click the Help button to see all available effects."
            />
          </TabsContent>
          
          <TabsContent value="split" className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[60vh] font-mono text-base"
                placeholder="Write your chapter content here. Use [effect]text[effect] to add dynamic text effects."
              />
              <div className="border rounded-md p-4 min-h-[60vh] overflow-y-auto">
                <DynamicText content={content} isEnabled={effectsEnabled} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}

      <div className="flex justify-end gap-4 mt-6">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save Chapter'}
        </Button>
      </div>
    </div>
  );
}