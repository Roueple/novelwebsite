// src/components/reading/reading-view.tsx
import React from 'react';
import { Lock } from 'lucide-react';
import DynamicText from './dynamic-text';
import { cn } from '@/lib/utils';

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

  const sizeClasses = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl',
    xl: 'text-2xl'
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
          onClick={() => alert('Subscription feature coming soon!')}
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
        <div className={cn(
          "prose max-w-none text-foreground", // Apply base prose styles and theme text color
          sizeClasses[textSize]
          // Theme background is handled by the parent layout/page
          // Text colors for effects are handled by CSS variables in globals.css
          )}>
          {/* Render dynamic text using the dedicated component */}
          <DynamicText content={content} isEnabled={effectsEnabled} />
        </div>
      </div>
    </div>
  );
}