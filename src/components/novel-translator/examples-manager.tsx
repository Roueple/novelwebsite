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

const ExamplesManager = ({
    currentProject,
    examples,
    onExamplesChange
  }: ExamplesManagerProps): React.ReactElement | null => {
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
                  onChange={(e) => updateExample(index, 'source', e.target.value)}
                />
              </div>
              <div className="flex flex-col">
                <Label>English Translation</Label>
                <Textarea 
                  placeholder="Enter English translation" 
                  className="h-32 flex-1"
                  value={example.target}
                  onChange={(e) => updateExample(index, 'target', e.target.value)}
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
  );
};

export default ExamplesManager;