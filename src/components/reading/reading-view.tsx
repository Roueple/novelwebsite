// src/components/reading/reading-view.tsx
import React from 'react';
import { Lock } from 'lucide-react';
import DynamicText from './dynamic-text'; // [cite: 1657]
import { cn } from '@/lib/utils'; // [cite: 1658]
import { toast } from 'sonner'; // [cite: 1658]
import LoadingSpinner from '@/components/ui/loading-spinner'; // <-- Import spinner

interface ReadingViewProps {
  isLoading: boolean; // <-- ADDED: Prop to indicate content loading
  content: string | null; // [cite: 1659]
  isLocked: boolean; // [cite: 1660]
  isAuthor: boolean; // [cite: 1660]
  isEditing: false; // [cite: 1661]
  textSize: 'sm' | 'md' | 'lg' | 'xl'; // [cite: 1662]
  effectsEnabled: boolean; // [cite: 1662]
}

export default function ReadingView({
  isLoading, // <-- ADDED: Destructure isLoading
  content,
  isLocked,
  isAuthor,
  textSize,
  effectsEnabled,
}: ReadingViewProps) {

  // Text size mapping (no change)
  const sizeClasses = { // [cite: 1663]
    sm: 'prose-sm',
    md: 'prose-base',
    lg: 'prose-lg',
    xl: 'prose-xl'
  };

  // --- Loading State ---
  // Display spinner centered within the content area if isLoading is true
  if (isLoading) {
    return (
      <div className="w-full min-h-[50vh] flex items-center justify-center">
         <div className="flex flex-col items-center space-y-3">
            <LoadingSpinner size="lg" className="text-primary"/>
            <p className="text-muted-foreground">Loading chapter content...</p>
         </div>
      </div>
    );
  }

  // --- Locked Content Handling --- (No change)
  if (isLocked && !isAuthor) { // [cite: 1664]
    return (
      <div className="max-w-4xl mx-auto px-4 md:px-8 text-center py-16">
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
        </button> {/* [cite: 1665] */}
      </div>
    ); // [cite: 1666]
  }

  // --- Null Content Handling (for authorized users) --- (No change)
  if (content === null && (!isLocked || isAuthor)) { // [cite: 1667]
     console.error("ReadingView: Content is null unexpectedly.", { isLocked, isAuthor });
     return (
        <div className="max-w-4xl mx-auto px-4 md:px-8 text-center py-16 text-destructive">
             Content could not be loaded for this chapter. Please try again later or contact support.
        </div>
     ); // [cite: 1668]
  }

  // --- Render Actual Content --- (No change, but now only runs when not loading)
  return (
    <div className="w-full">
      <div className="max-w-4xl mx-auto px-4 md:px-8">
         <div className={cn(
            "prose max-w-none text-foreground dark:prose-invert", // Base styles
            sizeClasses[textSize] // Dynamic size // [cite: 1669]
         )}>
          {/* Render dynamic text if content is a string */}
          {typeof content === 'string' ? ( // [cite: 1670]
            <DynamicText content={content} isEnabled={effectsEnabled} />
          ) : (
            // Fallback if content is somehow still not a string (should be handled above)
            <p className="text-muted-foreground italic">Chapter content is unavailable.</p> // [cite: 1670]
          )}
        </div>
      </div>
    </div> // [cite: 1671]
  );
}