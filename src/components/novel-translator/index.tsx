// src/components/novel-translator/index.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PlusCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { translationService } from '@/lib/translation-service';
import { TranslationProject, TranslationChapter, TranslationExample } from '@/types/translation';
import LoadingSpinner from '@/components/ui/loading-spinner';

// Import components
import ProjectSelector from './project-selector';
import ChapterList from './chapter-list';
import TranslationEditor from './translation-editor';
import ExamplesManager from './examples-manager';
import ProjectSettings from './project-settings';
import ScrapeDebugger from './scrape-debugger';

/**
 * Main Novel Translator component
 */
const NovelTranslator: React.FC = () => {
  // State
  const [projects, setProjects] = useState<TranslationProject[]>([]);
  const [currentProject, setCurrentProject] = useState<TranslationProject | null>(null);
  const [currentChapter, setCurrentChapter] = useState<TranslationChapter | null>(null);
  const [examples, setExamples] = useState<TranslationExample[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [projectNameError, setProjectNameError] = useState('');
  const [activeTab, setActiveTab] = useState('translate');
  
  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, []);
  
  /**
   * Load projects from database
   */
  const loadProjects = async (): Promise<void> => {
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
  
  /**
   * Select a project and load its data
   */
  const handleSelectProject = async (project: TranslationProject): Promise<void> => {
    setIsLoading(true);
    try {
      const fullProject = await translationService.getProject(project.id);
      if (fullProject) {
        setCurrentProject(fullProject);
        setExamples(fullProject.examples || []);
        setCurrentChapter(null);
        
        // Switch to translate tab
        setActiveTab('translate');
        
        toast.success(`Loaded project: ${fullProject.name}`);
      }
    } catch (error) {
      console.error('Error loading project:', error);
      toast.error('Failed to load project details');
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Handle project creation
   */
  const handleProjectCreated = (project: TranslationProject): void => {
    setProjects([...projects, project]);
    setCurrentProject(project);
    setExamples([]);
    setCurrentChapter(null);
    
    // Switch to translate tab
    setActiveTab('translate');
  };
  
  /**
   * Handle project update
   */
  const handleProjectUpdated = (updatedProject: TranslationProject): void => {
    setCurrentProject(updatedProject);
    setProjects(projects.map(p => 
      p.id === updatedProject.id ? updatedProject : p
    ));
  };
  
  /**
   * Select a chapter
   */
  const handleSelectChapter = async (chapterId: string): Promise<void> => {
    setIsLoading(true);
    try {
      const chapter = await translationService.getChapter(chapterId);
      if (chapter) {
        setCurrentChapter(chapter);
      }
    } catch (error) {
      console.error('Error loading chapter:', error);
      toast.error('Failed to load chapter');
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Save chapter updates
   */
  const handleSaveChapter = async (chapterId: string, updates: Partial<TranslationChapter>): Promise<void> => {
    try {
      await translationService.updateChapter(chapterId, updates);
      
      // Update current chapter state
      if (currentChapter && currentChapter.id === chapterId) {
        setCurrentChapter({
          ...currentChapter,
          ...updates
        });
      }
      
      // Update in the project chapters list
      if (currentProject) {
        const updatedChapters = currentProject.chapters?.map(ch => 
          ch.id === chapterId ? { ...ch, ...updates } : ch
        );
        
        setCurrentProject({
          ...currentProject,
          chapters: updatedChapters || []
        });
      }
    } catch (error) {
      console.error('Error saving chapter:', error);
      toast.error('Failed to save chapter');
      throw error;
    }
  };
  
  /**
   * Handle chapter creation
   */
  const handleChapterCreated = (chapter: TranslationChapter): void => {
    // Update current chapter
    setCurrentChapter(chapter);
    
    // Update chapters in project
    if (currentProject) {
      const updatedChapters = [...(currentProject.chapters || []), chapter];
      setCurrentProject({
        ...currentProject,
        chapters: updatedChapters
      });
    }
  };
  
  /**
   * Create a project directly in the welcome screen
   */
  const createProject = async (): Promise<void> => {
    if (!newProjectName.trim()) {
      setProjectNameError('Please enter a project name');
      return;
    }
    
    if (newProjectName.length < 3) {
      setProjectNameError('Project name must be at least 3 characters');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const newProject = await translationService.createProject(newProjectName);
      handleProjectCreated(newProject);
      setNewProjectName('');
      setProjectNameError('');
      setDialogOpen(false);
      toast.success(`Project "${newProjectName}" created`);
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Failed to create project');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      <header className="border-b p-4">
        <h1 className="text-2xl font-bold">Korean to English Novel Translator</h1>
      </header>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 border-r overflow-y-auto p-4 flex flex-col space-y-6">
          <ProjectSelector 
            projects={projects}
            currentProject={currentProject}
            onSelectProject={handleSelectProject}
            onProjectCreated={handleProjectCreated}
            isLoading={isLoading}
          />
          
          <ChapterList 
            project={currentProject}
            currentChapter={currentChapter}
            onSelectChapter={handleSelectChapter}
            isLoading={isLoading}
          />
        </div>
        
        {/* Main content */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentProject ? (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="translate">Translate</TabsTrigger>
                <TabsTrigger value="examples">Examples</TabsTrigger>
                <TabsTrigger value="settings">Project Settings</TabsTrigger>
                <TabsTrigger value="debug">Debug Tools</TabsTrigger>
              </TabsList>
              
              <TabsContent value="translate">
                <TranslationEditor 
                  currentProject={currentProject}
                  currentChapter={currentChapter}
                  examples={examples}
                  onSaveChapter={handleSaveChapter}
                  onChapterCreated={handleChapterCreated}
                />
              </TabsContent>
              
              <TabsContent value="examples">
                <ExamplesManager 
                  currentProject={currentProject}
                  examples={examples}
                  onExamplesChange={setExamples}
                />
              </TabsContent>
              
              <TabsContent value="settings">
                <ProjectSettings 
                  currentProject={currentProject}
                  onProjectUpdated={handleProjectUpdated}
                />
              </TabsContent>
              
              <TabsContent value="debug">
                <div className="space-y-4">
                  <Alert>
                    <AlertDescription>
                      Use these tools to debug issues with the scraping functionality. 
                      This tab is only visible to admins.
                    </AlertDescription>
                  </Alert>
                  
                  <ScrapeDebugger />
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <WelcomeScreen 
              createProject={createProject}
              newProjectName={newProjectName}
              setNewProjectName={setNewProjectName}
              projectNameError={projectNameError}
              setProjectNameError={setProjectNameError}
              isLoading={isLoading}
              dialogOpen={dialogOpen}
              setDialogOpen={setDialogOpen}
            />
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Welcome screen component
 */
interface WelcomeScreenProps {
  createProject: () => Promise<void>;
  newProjectName: string;
  setNewProjectName: (name: string) => void;
  projectNameError: string;
  setProjectNameError: (error: string) => void;
  isLoading: boolean;
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  createProject,
  newProjectName,
  setNewProjectName,
  projectNameError,
  setProjectNameError,
  isLoading,
  dialogOpen,
  setDialogOpen
}) => {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Welcome to the Korean-English Novel Translator</h2>
        <p className="text-muted-foreground mb-4">Create a new project or select an existing one to get started</p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
                onChange={(e) => {
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
                {isLoading ? <LoadingSpinner className="mr-2" /> : null}
                Create Project
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default NovelTranslator;