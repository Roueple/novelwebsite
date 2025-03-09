// src/components/novel-translator/index.tsx
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { PlusCircle, BookOpen, Download, RefreshCw, Trash2, Save, Globe, List, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { translationService } from '@/lib/translation-service';
import { TranslationProject, TranslationExample, TranslationChapter, ChapterLink } from '@/types/translation';
import LoadingSpinner from '@/components/ui/loading-spinner';

const NovelTranslator: React.FC = () => {
  // State management
  const [projects, setProjects] = useState<TranslationProject[]>([]);
  const [currentProject, setCurrentProject] = useState<TranslationProject | null>(null);
  const [examples, setExamples] = useState<TranslationExample[]>([]);
  const [persistentPrompt, setPersistentPrompt] = useState('');
  const [tempPrompt, setTempPrompt] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [currentChapter, setCurrentChapter] = useState<TranslationChapter | null>(null);
  const [availableChapters, setAvailableChapters] = useState<ChapterLink[]>([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [chapterSelectionOpen, setChapterSelectionOpen] = useState(false);
  const [projectNameError, setProjectNameError] = useState('');
  const [streamedTranslation, setStreamedTranslation] = useState('');
  
  // Refs
  const translatedTextRef = useRef<HTMLDivElement>(null);
  const reader = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const decoder = useRef(new TextDecoder());
  
  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, []);
  
  // Load projects from database
  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const projectsList = await translationService.getProjects();
      setProjects(projectsList);
    } catch (error) {
      console.error('Error loading projects:', error);
      toast.error('Failed to load translation projects');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Select a project
  const selectProject = async (projectId: string) => {
    setIsLoading(true);
    try {
      const project = await translationService.getProject(projectId);
      if (project) {
        setCurrentProject(project);
        setPersistentPrompt(project.persistent_prompt || '');
        setExamples(project.examples || []);
        setCurrentChapter(null);
        setSourceText('');
        setTranslatedText('');
        setTempPrompt('');
        setStreamedTranslation('');
      }
    } catch (error) {
      console.error('Error loading project:', error);
      toast.error('Failed to load project details');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Create a new project
  const createProject = async () => {
    if (!newProjectName.trim()) {
      setProjectNameError('Please enter a project name');
      return;
    }
    
    setIsLoading(true);
    try {
      const newProject = await translationService.createProject(newProjectName);
      setProjects([...projects, newProject]);
      setCurrentProject(newProject);
      setPersistentPrompt('');
      setExamples([]);
      setNewProjectName('');
      setProjectNameError('');
      toast.success(`Project "${newProjectName}" created`);
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Failed to create project');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Add a new example
  const addExample = () => {
    setExamples([...examples, { source: '', target: '' }]);
  };
  
  // Update example
  const updateExample = (index: number, field: 'source' | 'target', value: string) => {
    const updatedExamples = [...examples];
    updatedExamples[index][field] = value;
    setExamples(updatedExamples);
  };
  
  // Remove example
  const removeExample = (index: number) => {
    const updatedExamples = examples.filter((_, i) => i !== index);
    setExamples(updatedExamples);
  };
  
  // Save persistent prompt
  const savePersistentPrompt = async () => {
    if (!currentProject) return;
    
    setIsLoading(true);
    try {
      await translationService.updateProject(currentProject.id, {
        persistent_prompt: persistentPrompt
      });
      
      // Update local state
      setCurrentProject({
        ...currentProject,
        persistent_prompt: persistentPrompt
      });
      
      toast.success('Project settings saved');
    } catch (error) {
      console.error('Error saving project settings:', error);
      toast.error('Failed to save project settings');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Save examples to current project
  const saveExamplesToProject = async () => {
    if (!currentProject) return;
    
    setIsLoading(true);
    try {
      // First delete all existing examples
      const existingExamples = await translationService.getExamples(currentProject.id);
      for (const example of existingExamples) {
        if (example.id) {
          await translationService.deleteExample(example.id);
        }
      }
      
      // Then add all new examples
      for (const example of examples) {
        await translationService.addExample(currentProject.id, example.source, example.target);
      }
      
      toast.success('Examples saved to project');
    } catch (error) {
      console.error('Error saving examples:', error);
      toast.error('Failed to save examples');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to clean up scraped text
  const cleanScrapedText = (text: string): string => {
    if (!text) return '';
    
    // Remove excessive newlines
    let cleaned = text.replace(/\n{3,}/g, '\n\n');
    
    // Remove common ads/noise text
    const noisePatterns = [
      /sponsored content/gi,
      /advertisement/gi,
      /다음 화|이전 화/g,
      /댓글|목록/g,
      /请支持本站/g,
      /【推荐下载/g
    ];
    
    noisePatterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });
    
    return cleaned.trim();
  };
  
  // Scrape website and fetch content
  const scrapeWebsite = async () => {
    if (!websiteUrl.trim() || !currentProject) {
      toast.error('Please enter a website URL and select a project');
      return;
    }
    
    setIsScraping(true);
    
    try {
      const data = await translationService.scrapeWebsite(websiteUrl);
      
      // Clean the scraped text
      const cleanedText = cleanScrapedText(data.text);
      setSourceText(cleanedText);
      
      // Generate a better title if possible
      let chapterTitle = data.title || "New Chapter";
      if (data.chapter) {
        chapterTitle = `Chapter ${data.chapter}`;
      }
      
      // Create a new chapter
      const newChapter = await translationService.addChapter(
        currentProject.id,
        chapterTitle,
        cleanedText
      );
      
      setCurrentChapter(newChapter);
      
      toast.success('Content scraped successfully');
    } catch (error) {
      console.error('Error scraping website:', error);
      toast.error('Failed to scrape website');
    } finally {
      setIsScraping(false);
    }
  };
  
  // Scrape chapter index to find multiple chapters
  const scrapeChapterIndex = async () => {
    if (!websiteUrl.trim()) {
      toast.error('Please enter a website URL');
      return;
    }
    
    setIsScraping(true);
    
    try {
      const data = await translationService.scrapeChapterIndex(websiteUrl);
      
      if (data.chapters && data.chapters.length > 0) {
        setAvailableChapters(data.chapters);
        setChapterSelectionOpen(true);
        toast.success(`Found ${data.chapters.length} chapters`);
      } else {
        toast('No chapters found. Try scraping a single chapter instead.');
      }
    } catch (error) {
      console.error('Error scraping chapter index:', error);
      toast.error('Failed to scrape chapter index');
    } finally {
      setIsScraping(false);
    }
  };
  
  // Stops the current translation stream
  const stopTranslation = () => {
    if (reader.current) {
      reader.current.cancel();
      reader.current = null;
      setIsTranslating(false);
    }
  };
  
  // Translate text using API with streaming
  const translateText = async () => {
    if (!sourceText || !currentProject || !currentChapter) {
      toast.error('Please enter text to translate and select a project and chapter');
      return;
    }
    
    setIsTranslating(true);
    setStreamedTranslation('');
    
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
      
      // Save the translation to the chapter
      if (currentChapter) {
        await translationService.updateChapter(currentChapter.id!, {
          translated_text: result,
          temp_prompt: tempPrompt
        });
        
        // Update local state
        setCurrentChapter({
          ...currentChapter,
          translated_text: result,
          temp_prompt: tempPrompt
        });
      }
      
      toast.success('Translation completed');
    } catch (error) {
      console.error('Error translating text:', error);
      if (error instanceof Error) {
        toast.error(error.message || 'Translation failed');
      }
    } finally {
      setIsTranslating(false);
    }
  };
  
  // Select a chapter
  const selectChapter = async (chapterId: string) => {
    setIsLoading(true);
    try {
      const chapter = await translationService.getChapter(chapterId);
      if (chapter) {
        setCurrentChapter(chapter);
        setSourceText(chapter.source_text || '');
        setTranslatedText(chapter.translated_text || '');
        setStreamedTranslation(chapter.translated_text || '');
        setTempPrompt(chapter.temp_prompt || '');
      }
    } catch (error) {
      console.error('Error loading chapter:', error);
      toast.error('Failed to load chapter');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Download text files
  const downloadTextFile = (content: string, filename: string) => {
    const element = document.createElement('a');
    const file = new Blob([content], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
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
  
  // Cancel translation and close reader if component unmounts
  useEffect(() => {
    return () => {
      if (reader.current) {
        reader.current.cancel();
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-card">
      <header className="border-b p-4">
        <h1 className="text-2xl font-bold">Korean to English Novel Translator</h1>
      </header>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 border-r overflow-y-auto p-4">
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Projects</h2>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" className="w-full mb-2">
                  <PlusCircle className="mr-2 h-4 w-4" /> New Project
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Project</DialogTitle>
                  <DialogDescription>
                    Enter a name for your new translation project.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Label htmlFor="project-name">Project Name</Label>
                  <Input 
                    id="project-name" 
                    value={newProjectName} 
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setNewProjectName(e.target.value);
                      setProjectNameError('');
                    }} 
                    placeholder="Enter project name"
                    className={projectNameError ? "border-red-500" : ""}
                  />
                  {projectNameError && (
                    <p className="text-red-500 text-sm mt-1">{projectNameError}</p>
                  )}
                </div>
                <DialogFooter>
                  <Button onClick={createProject} disabled={isLoading}>
                    {isLoading ? <LoadingSpinner /> : 'Create Project'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            <div className="space-y-1">
              {projects.map(project => (
                <Button 
                  key={project.id} 
                  variant={currentProject?.id === project.id ? "default" : "ghost"} 
                  className="w-full justify-start text-left"
                  onClick={() => selectProject(project.id)}
                  disabled={isLoading}
                >
                  {project.name}
                </Button>
              ))}
            </div>
          </div>
          
          {currentProject && (
            <div>
              <h2 className="text-lg font-semibold mb-2">Chapters</h2>
              {currentProject.chapters && currentProject.chapters.length > 0 ? (
                <div className="space-y-1">
                  {currentProject.chapters.map((chapter: TranslationChapter) => (
                    <Button 
                      key={chapter.id} 
                      variant={currentChapter?.id === chapter.id ? "default" : "ghost"} 
                      className="w-full justify-start text-left"
                      onClick={() => chapter.id ? selectChapter(chapter.id) : null}
                      disabled={isLoading}
                    >
                      <BookOpen className="mr-2 h-4 w-4" /> {chapter.title}
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No chapters yet. Scrape a website to add one.</p>
              )}
            </div>
          )}
        </div>
        
        {/* Main content */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentProject ? (
            <Tabs defaultValue="translate">
              <TabsList className="mb-4">
                <TabsTrigger value="translate">Translate</TabsTrigger>
                <TabsTrigger value="examples">Examples</TabsTrigger>
                <TabsTrigger value="settings">Project Settings</TabsTrigger>
              </TabsList>
              
              <TabsContent value="translate" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Import Content</CardTitle>
                    <CardDescription>
                      Enter a URL to scrape content or paste Korean text directly
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex space-x-2 mb-4">
                      <Input 
                        placeholder="Enter website URL" 
                        value={websiteUrl} 
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWebsiteUrl(e.target.value)} 
                      />
                      <Button onClick={scrapeWebsite} disabled={isScraping || !currentProject}>
                        <Globe className="mr-2 h-4 w-4" /> 
                        {isScraping ? <LoadingSpinner /> : 'Scrape'}
                      </Button>
                      <Button 
                        onClick={scrapeChapterIndex} 
                        disabled={isScraping || !currentProject}
                        variant="outline"
                      >
                        <List className="mr-2 h-4 w-4" /> 
                        {isScraping ? <LoadingSpinner /> : 'Find Chapters'}
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="source-text">Korean Text</Label>
                        <Textarea 
                          id="source-text" 
                          className="h-64 font-mono" 
                          placeholder="Enter Korean text here" 
                          value={sourceText}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSourceText(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="translated-text">Translated Text</Label>
                        <div 
                          ref={translatedTextRef}
                          className="h-64 overflow-auto border rounded-md p-3 font-mono bg-white dark:bg-slate-900"
                        >
                          {streamedTranslation || translatedText || (
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
                    <CardDescription>
                      This prompt will only apply to the current chapter
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea 
                      placeholder="Enter temporary prompt instructions" 
                      className="h-32" 
                      value={tempPrompt}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setTempPrompt(e.target.value)}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="examples" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Translation Examples</CardTitle>
                    <CardDescription>
                      Add example translations to guide the AI (few-shot learning)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {examples.map((example, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b">
                          <div>
                            <Label>Korean Example</Label>
                            <Textarea 
                              placeholder="Enter Korean text" 
                              className="h-32"
                              value={example.source}
                              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateExample(index, 'source', e.target.value)}
                            />
                          </div>
                          <div className="flex flex-col">
                            <Label>English Translation</Label>
                            <Textarea 
                              placeholder="Enter English translation" 
                              className="h-32 flex-1"
                              value={example.target}
                              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateExample(index, 'target', e.target.value)}
                            />
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="self-end mt-2"
                              onClick={() => removeExample(index)}
                            >
                              <Trash2 className="h-4 w-4 mr-1" /> Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                      
                      {examples.length === 0 && (
                        <Alert>
                          <AlertDescription>
                            No examples yet. Add examples to improve translation quality through few-shot learning.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button variant="outline" onClick={addExample}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Add Example
                    </Button>
                    <Button onClick={saveExamplesToProject} disabled={isLoading}>
                      {isLoading ? (
                        <LoadingSpinner className="mr-2" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )} 
                      Save Examples
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>
              
              <TabsContent value="settings">
                <Card>
                  <CardHeader>
                    <CardTitle>Project Settings</CardTitle>
                    <CardDescription>
                      Configure global settings for this translation project
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label>Project Persistent Prompt</Label>
                        <Textarea 
                          placeholder="Enter instructions that will apply to all translations in this project" 
                          className="h-64"
                          value={persistentPrompt}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPersistentPrompt(e.target.value)}
                        />
                        <p className="text-sm text-muted-foreground mt-2">
                          This prompt will be automatically applied to all future translations in this project.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button onClick={savePersistentPrompt} disabled={isLoading}>
                      {isLoading ? (
                        <LoadingSpinner className="mr-2" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )} 
                      Save Settings
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-2">Welcome to the Korean-English Novel Translator</h2>
                <p className="text-muted-foreground mb-4">Create a new project or select an existing one to get started</p>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <PlusCircle className="mr-2 h-4 w-4" /> Create New Project
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Project</DialogTitle>
                      <DialogDescription>
                        Enter a name for your new translation project.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <Label htmlFor="project-name-welcome">Project Name</Label>
                      <Input 
                        id="project-name-welcome" 
                        value={newProjectName} 
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          setNewProjectName(e.target.value);
                          setProjectNameError('');
                        }} 
                        placeholder="Enter project name"
                        className={projectNameError ? "border-red-500" : ""}
                      />
                      {projectNameError && (
                        <p className="text-red-500 text-sm mt-1">{projectNameError}</p>
                      )}
                    </div>
                    <DialogFooter>
                      <Button onClick={createProject} disabled={isLoading}>
                        {isLoading ? <LoadingSpinner /> : 'Create Project'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Chapter Selection Dialog */}
      <Dialog open={chapterSelectionOpen} onOpenChange={setChapterSelectionOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select a Chapter</DialogTitle>
            <DialogDescription>
              {availableChapters.length} chapters found. Click a chapter to load it.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 py-4">
            {availableChapters.map((chap, index) => (
              <Button 
                key={index} 
                variant="outline" 
                className="text-left justify-start"
                onClick={() => {
                  setChapterSelectionOpen(false);
                  // Set the URL and trigger scraping for this chapter
                  setWebsiteUrl(chap.url);
                  setTimeout(() => scrapeWebsite(), 100);
                }}
              >
                <span className="truncate">
                  {chap.title || `Chapter ${chap.chapter || index + 1}`}
                </span>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NovelTranslator;