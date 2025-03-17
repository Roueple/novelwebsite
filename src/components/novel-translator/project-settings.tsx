// src/components/novel-translator/project-settings.tsx
import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { TranslationProject } from '@/types/translation';
import { translationService } from '@/lib/translation-service';
import LoadingSpinner from '@/components/ui/loading-spinner';

interface ProjectSettingsProps {
  currentProject: TranslationProject | null;
  onProjectUpdated: (project: TranslationProject) => void;
}

const ProjectSettings: React.FC<ProjectSettingsProps> = ({
  currentProject,
  onProjectUpdated
}) => {
  const [projectName, setProjectName] = useState('');
  const [persistentPrompt, setPersistentPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Update state when current project changes
  useEffect(() => {
    if (currentProject) {
      setProjectName(currentProject.name);
      setPersistentPrompt(currentProject.persistent_prompt || '');
    } else {
      setProjectName('');
      setPersistentPrompt('');
    }
  }, [currentProject]);

  const saveProjectSettings = async () => {
    if (!currentProject) {
      toast.error('No project selected');
      return;
    }
    
    if (!projectName.trim()) {
      toast.error('Project name cannot be empty');
      return;
    }
    
    setIsLoading(true);
    
    try {
      await translationService.updateProject(currentProject.id, {
        name: projectName,
        persistent_prompt: persistentPrompt
      });
      
      // Update the current project in the parent component
      onProjectUpdated({
        ...currentProject,
        name: projectName,
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

  if (!currentProject) return null;

  return (
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
            <Label htmlFor="project-name">Project Name</Label>
            <Input 
              id="project-name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Enter project name"
            />
          </div>
          
          <div>
            <Label htmlFor="persistent-prompt">Project Persistent Prompt</Label>
            <Textarea 
              id="persistent-prompt"
              placeholder="Enter instructions that will apply to all translations in this project" 
              className="h-64"
              value={persistentPrompt}
              onChange={(e) => setPersistentPrompt(e.target.value)}
            />
            <p className="text-sm text-muted-foreground mt-2">
              This prompt will be automatically applied to all future translations in this project.
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={saveProjectSettings} disabled={isLoading}>
          {isLoading ? (
            <LoadingSpinner className="mr-2" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )} 
          Save Settings
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ProjectSettings;