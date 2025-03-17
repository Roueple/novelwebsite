// src/components/novel-translator/translation-editor.tsx
import React, { useState, useRef, useEffect } from 'react';
import { X, Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { translationService } from '@/lib/translation-service';
import { TranslationProject, TranslationChapter, TranslationExample } from '@/types/translation';
import LoadingSpinner from '@/components/ui/loading-spinner';
import ContentScraper from './content-scraper';

interface TranslationEditorProps {
  currentProject: TranslationProject | null;
  currentChapter: TranslationChapter | null;
  examples: TranslationExample[];
  onSaveChapter: (chapterId: string, updates: Partial<TranslationChapter>) => Promise<void>;
  onChapterCreated: (chapter: TranslationChapter) => void;
}

const TranslationEditor: React.FC<TranslationEditorProps> = ({
  currentProject,
  currentChapter,
  examples,
  onSaveChapter,
  onChapterCreated
}) => {
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [tempPrompt, setTempPrompt] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [streamedTranslation, setStreamedTranslation] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Refs
  const translatedTextRef = useRef<HTMLDivElement>(null);
  const reader = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const decoder = useRef(new TextDecoder());

  // Update state when current chapter changes
  useEffect(() => {
    if (currentChapter) {
      setSourceText(currentChapter.source_text || '');
      setTranslatedText(currentChapter.translated_text || '');
      setStreamedTranslation(currentChapter.translated_text || '');
      setTempPrompt(currentChapter.temp_prompt || '');
      setError(null);
    } else {
      setSourceText('');
      setTranslatedText('');
      setStreamedTranslation('');
      setTempPrompt('');
      setError(null);
    }
  }, [currentChapter]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reader.current) {
        reader.current.cancel();
      }
    };
  }, []);

  const stopTranslation = () => {
    if (reader.current) {
      reader.current.cancel();
      reader.current = null;
      setIsTranslating(false);
    }
  };
  
  const translateText = async () => {
    if (!sourceText || !currentProject || !currentChapter) {
      toast.error('Please enter text to translate and select a project and chapter');
      return;
    }
    
    setIsTranslating(true);
    setStreamedTranslation('');
    setError(null);
    
    try {
      // Use streaming translation
      const response = await translationService.translateText(
        {
          sourceText,
          examples,
          persistentPrompt: currentProject.persistent_prompt || '',
          tempPrompt
        },
        true
      );
      
      if (!response.ok) {
        // Handle error response by parsing the JSON
        const errorData = await response.json();
        setError(errorData.error || 'Translation failed');
        setIsTranslating(false);
        return;
      }
      
      // Process the streaming response
      if (!response.body) {
        throw new Error('No response body received');
      }
      
      reader.current = response.body.getReader();
      
      let result = '';
      
      while (true) {
        const { done, value } = await reader.current.read();
        
        if (done) {
          reader.current = null;
          break;
        }
        
        // Decode the chunk and append to result
        const chunk = decoder.current.decode(value, { stream: true });
        result += chunk;
        setStreamedTranslation(result);
        
        // Auto-scroll to bottom
        if (translatedTextRef.current) {
          translatedTextRef.current.scrollTop = translatedTextRef.current.scrollHeight;
        }
      }
      
      // Check if response contains error JSON
      try {
        const resultJson = JSON.parse(result);
        if (resultJson.error) {
          setError(resultJson.error);
          setIsTranslating(false);
          return;
        }
      } catch (e) {
        // If it's not JSON, continue normally
      }
      
      // Save the translation to the chapter
      if (currentChapter) {
        await onSaveChapter(currentChapter.id!, {
          translated_text: result,
          temp_prompt: tempPrompt
        });
        
        toast.success('Translation completed and saved');
      }
    } catch (error) {
      console.error('Error translating text:', error);
      if (error instanceof Error) {
        setError(error.message || 'Translation failed');
      } else {
        setError('Translation failed');
      }
    } finally {
      setIsTranslating(false);
    }
  };

  const handleContentScraped = async (title: string, content: string, chapterNumber?: number | string) => {
    if (!currentProject) return;
    
    try {
      // Create a new chapter
      const newChapter = await translationService.addChapter(
        currentProject.id,
        title,
        content,
        '', // Empty translation initially
        '', // No temp prompt initially
        typeof chapterNumber === 'number' ? chapterNumber : undefined
      );
      
      // Update UI state
      onChapterCreated(newChapter);
      
      toast.success('Chapter created successfully');
    } catch (error) {
      console.error('Error creating chapter:', error);
      toast.error('Failed to create chapter');
    }
  };

  // Download raw text
  const downloadRawText = () => {
    if (!currentChapter || !sourceText) return;
    downloadTextFile(sourceText, `raw_${currentChapter.title}.txt`);
  };
  
  // Download translated text
  const downloadTranslatedText = () => {
    const textToDownload = streamedTranslation || translatedText;
    if (!currentChapter || !textToDownload) return;
    downloadTextFile(textToDownload, `translated_${currentChapter.title}.txt`);
  };
  
  // Download text file helper
  const downloadTextFile = (content: string, filename: string) => {
    const element = document.createElement('a');
    const file = new Blob([content], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Import Content</CardTitle>
        </CardHeader>
        <CardContent>
          <ContentScraper 
            currentProject={currentProject}
            onContentScraped={handleContentScraped}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <Label htmlFor="source-text">Korean Text</Label>
              <Textarea 
                id="source-text" 
                className="h-64 font-mono" 
                placeholder="Enter Korean text here" 
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="translated-text">Translated Text</Label>
              <div 
                ref={translatedTextRef}
                className="h-64 overflow-auto border rounded-md p-3 font-mono bg-background"
              >
                {error ? (
                  <div className="text-red-500">Error: {error}</div>
                ) : streamedTranslation || translatedText ? (
                  <div className="whitespace-pre-wrap">{streamedTranslation || translatedText}</div>
                ) : (
                  <span className="text-muted-foreground">Translation will appear here</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div>
            <Button 
              variant="outline" 
              onClick={downloadRawText} 
              disabled={!currentChapter?.source_text}
              className="mr-2"
            >
              <Download className="mr-2 h-4 w-4" /> Download Raw
            </Button>
            <Button 
              variant="outline" 
              onClick={downloadTranslatedText} 
              disabled={!streamedTranslation && !currentChapter?.translated_text}
            >
              <Download className="mr-2 h-4 w-4" /> Download Translation
            </Button>
          </div>
          <div className="flex space-x-2">
            {isTranslating && (
              <Button 
                variant="destructive" 
                onClick={stopTranslation}
              >
                <X className="mr-2 h-4 w-4" /> Stop
              </Button>
            )}
            <Button 
              onClick={translateText} 
              disabled={isTranslating || !sourceText || !currentChapter}
            >
              {isTranslating ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Translating...
                </>
              ) : (
                <>Translate</>
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Chapter-Specific Prompt</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea 
            placeholder="Enter temporary prompt instructions for this chapter" 
            className="h-32" 
            value={tempPrompt}
            onChange={(e) => setTempPrompt(e.target.value)}
          />
          <p className="text-sm text-muted-foreground mt-2">
            This prompt will only apply to the current chapter translation.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default TranslationEditor;