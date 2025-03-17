// src/components/novel-translator/content-scraper.tsx
import React, { useState } from 'react';
import { Globe, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { translationService } from '@/lib/translation-service';
import { TranslationProject, ChapterLink } from '@/types/translation';
import LoadingSpinner from '@/components/ui/loading-spinner';

interface ContentScraperProps {
  currentProject: TranslationProject | null;
  onContentScraped: (title: string, content: string, chapterNumber?: number | string) => void;
}

/**
 * Helper to clean scraped text
 */
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

const ContentScraper: React.FC<ContentScraperProps> = ({
  currentProject,
  onContentScraped
}) => {
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [chapterSelectionOpen, setChapterSelectionOpen] = useState(false);
  const [availableChapters, setAvailableChapters] = useState<ChapterLink[]>([]);

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
      
      // Generate a title if possible
      let chapterTitle = data.title || "New Chapter";
      
      // Handle chapter number - ensure it's not null when passing
      let chapterNumber: string | number | undefined = data.chapter || undefined;
      
      if (data.chapter) {
        chapterTitle = `Chapter ${data.chapter}`;
      }
      
      onContentScraped(chapterTitle, cleanedText, chapterNumber);
      
      toast.success('Content scraped successfully');
    } catch (error) {
      console.error('Error scraping website:', error);
      
      if (error instanceof Error) {
        toast.error(`Scraping failed: ${error.message}`);
      } else {
        toast.error('Failed to scrape website: Unknown error');
      }
    } finally {
      setIsScraping(false);
    }
  };

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
      
      if (error instanceof Error) {
        toast.error(`Failed to find chapters: ${error.message}`);
      } else {
        toast.error('Failed to scrape chapter index');
      }
    } finally {
      setIsScraping(false);
    }
  };

  return (
    <>
      <div className="flex space-x-2">
        <Input 
          placeholder="Enter website URL" 
          value={websiteUrl} 
          onChange={(e) => setWebsiteUrl(e.target.value)} 
          disabled={isScraping}
        />
        <Button 
          onClick={scrapeWebsite} 
          disabled={isScraping || !currentProject || !websiteUrl.trim()}
        >
          {isScraping ? (
            <LoadingSpinner className="mr-2" />
          ) : (
            <Globe className="mr-2 h-4 w-4" />
          )}
          Scrape
        </Button>
        
        <Button 
          onClick={scrapeChapterIndex} 
          disabled={isScraping || !currentProject || !websiteUrl.trim()}
          variant="outline"
        >
          {isScraping ? (
            <LoadingSpinner className="mr-2" />
          ) : (
            <List className="mr-2 h-4 w-4" />
          )}
          Find Chapters
        </Button>
      </div>

      {/* Chapter Selection Dialog */}
      <Dialog open={chapterSelectionOpen} onOpenChange={setChapterSelectionOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select a Chapter</DialogTitle>
          </DialogHeader>
          
          <div className="py-2">
            <p className="text-sm text-muted-foreground mb-4">
              {availableChapters.length} chapters found. Click a chapter to load it.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 py-4">
            {availableChapters.map((chap, index) => (
              <Button 
                key={index} 
                variant="outline" 
                className="text-left justify-start h-auto py-2"
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
    </>
  );
};

export default ContentScraper;