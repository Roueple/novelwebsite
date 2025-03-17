// src/components/novel-translator/examples-manager.tsx
import React, { useState } from 'react';
import { PlusCircle, Trash2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { TranslationExample, TranslationProject } from '@/types/translation';
import { translationService } from '@/lib/translation-service';
import LoadingSpinner from '@/components/ui/loading-spinner';

interface ExamplesManagerProps {
  currentProject: TranslationProject | null;
  examples: TranslationExample[];
  onExamplesChange: (examples: TranslationExample[]) => void;
}

const ExamplesManager: React.FC<ExamplesManagerProps> = ({
  currentProject,
  examples,
  onExamplesChange
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const addExample = () => {
    onExamplesChange([...examples, { source: '', target: '' }]);
  };
  
  const updateExample = (index: number, field: 'source' | 'target', value: string) => {
    const updatedExamples = [...examples];
    updatedExamples[index][field] = value;
    onExamplesChange(updatedExamples);
  };
  
  const removeExample = (index: number) => {
    const updatedExamples = examples.filter((_, i) => i !== index);
    onExamplesChange(updatedExamples);
  };
  
  const saveExamplesToProject = async () => {
    if (!currentProject) {
      toast.error('No project selected');
      return;
    }
    
    setIsLoading(true);
    
    try {
      await translationService.saveExamples(currentProject.id, examples);
      toast.success('Examples saved to project');
    } catch (error) {
      console.error('Error saving examples:', error);
      toast.error('Failed to save examples');
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentProject) return null;

  return (