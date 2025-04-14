// src/components/reading/reading-view.tsx
import React from 'react';
import { Lock } from 'lucide-react';
import DynamicText from './dynamic-text';
import { cn } from '@/lib/utils';
import { toast } from 'sonner'; // <--- ADD THIS IMPORT

interface ReadingViewProps {
  content: string;
  isLocked: boolean;
  isAuthor: boolean; // To bypass lock overlay for author
  isEditing: false; // Explicitly set to false for reading view
  textSize: 'sm' | 'md' | 'lg' | 'xl';
  effectsEnabled: boolean;
}

export default function ReadingView({
  content,
  isLocked,
  isAuthor,
  textSize,
  effectsEnabled,
}: ReadingViewProps) {

  // Correct mapping of textSize state to Tailwind classes
  const sizeClasses = {
    sm: 'prose-sm', // Use Tailwind Typography size modifiers if configured, or fallback
    md: 'prose-base', // Base prose size
    lg: 'prose-lg',
    xl: 'prose-xl'
    // If prose modifiers aren't sufficient, use direct text sizes:
    // sm: 'text-sm md:text-base', // Example fallback
    // md: 'text-base md:text-lg',
    // lg: 'text-lg md:text-xl',
    // xl: 'text-xl md:text-2xl',
  };

  // Render locked view if applicable (and user is not the author)
  if (isLocked && !isAuthor) {
    return (
      <div className="max-w-4xl mx-auto px-4 md:px-8 text-center py-16">
        <Lock
          size={48}
          className="mx-auto mb-4 text-muted-foreground" // Use theme-neutral color
        />
        <h2 className="text-2xl font-bold mb-2 text-foreground">
          Premium Chapter
        </h2>
        <p className="mb-8 text-muted-foreground">
          This chapter requires a subscription to read.
        </p>
        <button
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          onClick={() => toast.info('Subscription feature coming soon!')} // toast is now defined
        >
          Subscribe to Unlock
        </button>
      </div>
    );
  }

  // Render reading view
  return (
    <div className="w-full">
      <div className="max-w-4xl mx-auto px-4 md:px-8">
         {/* Apply text size class directly to the prose container */}
         <div className={cn(
          "prose max-w-none text-foreground", // Base prose styles
          sizeClasses[textSize] // Apply dynamic size class here
        )}>
          <DynamicText content={content} isEnabled={effectsEnabled} />
        </div>
      </div>
    </div>
  );
}