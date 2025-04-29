// src/components/reading/reading-view.tsx
import React from 'react';
import { Lock } from 'lucide-react';
import DynamicText from './dynamic-text'; // Component to render text with effects
import { cn } from '@/lib/utils';
import { toast } from 'sonner'; // For user feedback (e.g., subscribe button)

interface ReadingViewProps {
  content: string | null; // Content might be null if locked/unauthorized
  isLocked: boolean; // Chapter's locked status
  isAuthor: boolean; // To bypass lock overlay for author/admin
  isEditing: false; // Ensure this is always false for this component
  textSize: 'sm' | 'md' | 'lg' | 'xl'; // Text size preference
  effectsEnabled: boolean; // Whether dynamic text effects are enabled
}

export default function ReadingView({
  content,
  isLocked,
  isAuthor,
  textSize,
  effectsEnabled,
}: ReadingViewProps) {

  // Map text size state to Tailwind CSS classes
  const sizeClasses = {
    sm: 'prose-sm',
    md: 'prose-base',
    lg: 'prose-lg',
    xl: 'prose-xl'
  };

  // --- Locked Content Handling ---
  // Display lock overlay if the chapter is locked AND the user is not the author
  if (isLocked && !isAuthor) {
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
        </button>
      </div>
    );
  }

  // --- Null Content Handling (for authorized users) ---
  // If content is null, but it shouldn't be (e.g., chapter isn't locked, or user is author),
  // it indicates an unexpected error (API issue, data corruption, etc.)
  if (content === null && (!isLocked || isAuthor)) {
     console.error("ReadingView: Content is null unexpectedly.", { isLocked, isAuthor });
     return (
        <div className="max-w-4xl mx-auto px-4 md:px-8 text-center py-16 text-destructive">
             Content could not be loaded for this chapter. Please try again later or contact support.
        </div>
     );
  }

  // --- Render Actual Content ---
  // Only proceed if content is a string (meaning user is authorized and content exists)
  return (
    <div className="w-full">
      <div className="max-w-4xl mx-auto px-4 md:px-8">
         {/* Apply prose styling and dynamic text size class */}
         <div className={cn(
            "prose max-w-none text-foreground dark:prose-invert", // Base styles
            sizeClasses[textSize] // Dynamic size
         )}>
          {/* FIX: Explicitly check if content is a string before rendering DynamicText */}
          {typeof content === 'string' ? (
            <DynamicText content={content} isEnabled={effectsEnabled} />
          ) : (
            // This case should ideally not be reached due to the checks above,
            // but provides a fallback rendering if content is unexpectedly not a string.
            <p className="text-muted-foreground italic">Chapter content is unavailable.</p>
          )}
        </div>
      </div>
    </div>
  );
}