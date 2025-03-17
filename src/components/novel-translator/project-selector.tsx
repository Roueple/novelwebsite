// src/components/novel-translator/project-selector.tsx
import React, { useState } from 'react';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { TranslationProject } from '@/types/translation';
import { translationService } from '@/lib/translation-service';
import LoadingSpinner from '@/components/ui/loading-spinner';

interface ProjectSelectorProps {
  projects: TranslationProject[];
  currentProject: TranslationProject | null;
  onSelectProject: (project: TranslationProject) => void;
  onProjectCreated: (project: TranslationProject) => void;
  isLoading: boolean;
}

const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  projects,
  currentProject,
  onSelectProject,
  onProjectCreated,
  isLoading
}) => {
  const [newProjectName, setNewProjectName] = useState('');
  const [projectNameError, setProjectNameError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const createProject = async () => {
    if (!newProjectName.trim()) {
      setProjectNameError('Please enter a project name');
      return;
    }

    if (newProjectName.length < 3) {
      setProjectNameError('Project name must be at least 3 characters');
      return;
    }
    
    setIsCreating(true);
    
    try {
      const newProject = await translationService.createProject(newProjectName);
      onProjectCreated(newProject);
      setNewProjectName('');
      setProjectNameError('');
      setDialogOpen(false);
      toast.success(`Project "${newProjectName}" created`);
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Failed to create project');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">Projects</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
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
              <Button onClick={createProject} disabled={isCreating}>
                {isCreating ? <LoadingSpinner className="mr-2" /> : null}
                Create Project
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="space-y-1 max-h-[calc(100vh-300px)] overflow-y-auto">
        {projects.length === 0 ? (
          <div className="text-sm text-muted-foreground py-2 px-3 rounded-md border bg-muted/20">
            No projects yet. Create your first project to get started.
          </div>
        ) : (
          projects.map(project => (
            <Button 
              key={project.id} 
              variant={currentProject?.id === project.id ? "default" : "ghost"} 
              className="w-full justify-start text-left"
              onClick={() => onSelectProject(project)}
              disabled={isLoading}
            >
              {project.name}
            </Button>
          ))
        )}
      </div>
    </div>
  );
};

export default ProjectSelector;