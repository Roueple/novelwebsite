// src/components/novel-translator/chapter-list.tsx
import React from 'react';
import { BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TranslationChapter, TranslationProject } from '@/types/translation';

interface ChapterListProps {
  project: TranslationProject | null;
  currentChapter: TranslationChapter | null;
  onSelectChapter: (chapterId: string) => void;
  isLoading: boolean;
}

const ChapterList: React.FC<ChapterListProps> = ({
  project,
  currentChapter,
  onSelectChapter,
  isLoading
}) => {
  if (!project) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Chapters</h2>
      
      <div className="space-y-1 max-h-[calc(100vh-350px)] overflow-y-auto">
        {project.chapters && project.chapters.length > 0 ? (
          project.chapters.map((chapter) => (
            <Button 
              key={chapter.id} 
              variant={currentChapter?.id === chapter.id ? "default" : "ghost"} 
              className="w-full justify-start text-left"
              onClick={() => chapter.id ? onSelectChapter(chapter.id) : null}
              disabled={isLoading}
            >
              <BookOpen className="mr-2 h-4 w-4" /> 
              <span className="truncate flex-1">
                {chapter.title}
              </span>
            </Button>
          ))
        ) : (
          <div className="text-sm text-muted-foreground py-2 px-3 rounded-md border bg-muted/20">
            No chapters yet. Scrape a website to add one.
          </div>
        )}
      </div>
    </div>
  );
};

export default ChapterList;