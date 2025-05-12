// src/components/reading/reading-view.tsx
import React from 'react';
import { Lock } from 'lucide-react';
import DynamicText from './dynamic-text';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Chapter } from '@/types'; // Import Chapter
import LoadingSpinner from '@/components/ui/loading-spinner'; // Keep for potential future use? Or remove if truly gone.

interface ReadingViewProps {
  // Accept the whole chapter object or null
  chapter: Chapter | null;
  isAuthor: boolean;
  isEditing: false; // Ensure this is always false for this component
  textSize: 'sm' | 'md' | 'lg' | 'xl';
  effectsEnabled: boolean;
}

export default function ReadingView({
  chapter, // Use chapter prop
  isAuthor,
  textSize,
  effectsEnabled,
}: ReadingViewProps) {

  // Text size mapping
  const sizeClasses = {
    sm: 'prose-sm',
    md: 'prose-base',
    lg: 'prose-lg',
    xl: 'prose-xl'
  };

  // --- Initial Loading / Chapter Not Found ---
  // Show skeleton if chapter prop is null (meaning parent hasn't loaded it yet)
  if (chapter === null) {
    return (
      <div className="w-full animate-pulse">
        <div className="max-w-4xl mx-auto px-4 md:px-8 space-y-4 py-8">
            {/* Skeleton paragraphs */}
            <div className="h-4 bg-muted rounded w-full"></div>
            <div className="h-4 bg-muted rounded w-5/6"></div>
            <div className="h-4 bg-muted rounded w-full"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-full"></div>
            <div className="h-4 bg-muted rounded w-full"></div>
            <div className="h-4 bg-muted rounded w-4/6"></div>
        </div>
      </div>
    );
  }

  // Destructure after null check
  const { content, is_locked: isLocked } = chapter;

  // --- Locked Content Handling ---
  if (isLocked && !isAuthor) {
    return (
       // Added animation class here for consistency when lock state appears
      <div className="max-w-4xl mx-auto px-4 md:px-8 text-center py-16 animate-fade-in-content">
        <Lock
          size={48}
          className="mx-auto mb-4 text-muted-foreground"
        />
        <h2 className="text-2xl font-bold mb-2 text-foreground">
             Premium Chapter
        </h2>
        <p className="mb-8 text-muted-foreground">
          This chapter requires a subscription to read.
        </p>
        <button
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          onClick={() => toast.info('Subscription feature coming soon!')}
        >
             Subscribe to Unlock
        </button>
      </div>
    );
  }

  // --- Null Content Handling (Authorized but content missing) ---
  if (content === null && (!isLocked || isAuthor)) {
     console.error("ReadingView: Content is null unexpectedly.", { isLocked, isAuthor });
     return (
       // Added animation class here too
        <div className="max-w-4xl mx-auto px-4 md:px-8 text-center py-16 text-destructive animate-fade-in-content">
             Content could not be loaded for this chapter. Please try again later or contact support.
        </div>
     );
  }

  // --- Render Actual Content ---
  return (
    // Apply animation class to the outer wrapper for fade-in on chapter change
    <div className="w-full animate-fade-in-content">
      <div className="max-w-4xl mx-auto px-4 md:px-8">
         <div className={cn(
            "prose max-w-none text-foreground dark:prose-invert", // Base styles
            sizeClasses[textSize] // Dynamic size
         )}>
          {/* Render dynamic text only if content is a string */}
          {typeof content === 'string' ? (
            <DynamicText content={content} isEnabled={effectsEnabled} />
          ) : (
             // Fallback if content is somehow still not string/null (shouldn't happen often)
            <p className="text-muted-foreground italic">Chapter content is unavailable.</p>
          )}
        </div>
      </div>
    </div>
  );
}