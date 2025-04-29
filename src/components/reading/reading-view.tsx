// src/components/reading/reading-view.tsx
import React from 'react';
import { Lock } from 'lucide-react';
import DynamicText from './dynamic-text';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
// import LoadingSpinner from '@/components/ui/loading-spinner'; // <-- REMOVED spinner import

interface ReadingViewProps {
  // isLoading: boolean; // <-- REMOVED isLoading prop
  content: string | null;
  isLocked: boolean;
  isAuthor: boolean;
  isEditing: false;
  textSize: 'sm' | 'md' | 'lg' | 'xl';
  effectsEnabled: boolean;
}

export default function ReadingView({
  // isLoading, // <-- REMOVED isLoading prop
  content,
  isLocked,
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

  // --- REMOVED Loading State Check ---
  // if (isLoading) { ... }

  // --- Locked Content Handling --- (No change)
  if (isLocked && !isAuthor) {
    return (
      <div className="max-w-4xl mx-auto px-4 md:px-8 text-center py-16 animate-fade-in-content"> {/* Added animation class here too */}
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

  // --- Null Content Handling (for authorized users) --- (No change)
  if (content === null && (!isLocked || isAuthor)) {
     console.error("ReadingView: Content is null unexpectedly.", { isLocked, isAuthor });
     return (
        <div className="max-w-4xl mx-auto px-4 md:px-8 text-center py-16 text-destructive animate-fade-in-content"> {/* Added animation class here too */}
             Content could not be loaded for this chapter. Please try again later or contact support.
        </div>
     );
  }

  // --- Render Actual Content ---
  // Added outer div with animation class
  return (
    <div className="w-full animate-fade-in-content"> {/* Apply animation class here */}
      <div className="max-w-4xl mx-auto px-4 md:px-8">
         <div className={cn(
            "prose max-w-none text-foreground dark:prose-invert", // Base styles
            sizeClasses[textSize] // Dynamic size
         )}>
          {/* Render dynamic text if content is a string */}
          {typeof content === 'string' ? (
            <DynamicText content={content} isEnabled={effectsEnabled} />
          ) : (
            // Fallback
            <p className="text-muted-foreground italic">Chapter content is unavailable.</p>
          )}
        </div>
      </div>
    </div>
  );
}