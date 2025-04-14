// src/components/reading/reading-view.tsx
import React, { useRef, useEffect } from 'react';
import { Lock } from 'lucide-react';
import { useTheme } from '@/providers/theme-provider';
import DynamicText from './dynamic-text';
import { cn } from '@/lib/utils'; // Import cn utility

interface ReadingViewProps {
  content: string;
  isLocked: boolean;
  isAuthor: boolean;
  isEditing: boolean;
  textSize: 'sm' | 'md' | 'lg' | 'xl';
  effectsEnabled: boolean;
  saving?: boolean; // Pass down saving state
  onContentChange?: (content: string) => void;
}

export default function ReadingView({
  content,
  isLocked,
  isAuthor,
  isEditing,
  textSize,
  effectsEnabled,
  saving = false, // Default saving to false
  onContentChange
}: ReadingViewProps) {
  const { theme } = useTheme();
  const editableDivRef = useRef<HTMLDivElement>(null);

  // When switching to edit mode, focus the div and set initial content
  // Ensure content is updated if it changes externally while editing
  useEffect(() => {
    if (isEditing && editableDivRef.current) {
      // Only update if the current display differs from the prop, avoids cursor jump
      if (editableDivRef.current.innerText !== content) {
        editableDivRef.current.innerText = content;
      }
      // Optional: focus the div when editing starts
      // editableDivRef.current.focus();
    }
  }, [isEditing, content]); // Rerun when editing starts or content prop changes

  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (onContentChange) {
      const newContent = e.currentTarget.innerText;
      // Only call onChange if content actually changed
      if (newContent !== content) {
        onContentChange(newContent);
      }
    }
  };

  const getThemeStyles = () => {
    // Theme styles (same as before)
    switch (theme) {
      case 'reading':
        return {
          text: 'text-[#2C3E50]',
          bracketed: 'text-[#8B4513]',
          dialogue: 'text-[#2C3E50] font-semibold',
          background: 'bg-[#F5E6D3]',
          editableBorder: 'border-reading-accent'
        };
      case 'dark':
        return {
          text: 'text-white',
          bracketed: 'text-gray-300',
          dialogue: 'text-gray-100 font-semibold',
          background: 'bg-[#1a1a1a]',
          editableBorder: 'border-gray-600'
        };
      default: // light
        return {
          text: 'text-gray-900',
          bracketed: 'text-gray-600',
          dialogue: 'text-gray-800 font-semibold',
          background: 'bg-white',
          editableBorder: 'border-gray-400'
        };
    }
  };

  const sizeClasses = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl',
    xl: 'text-2xl'
  };

  const styles = getThemeStyles();

  // Render locked view if applicable
  if (isLocked && !isAuthor) {
    return (
      <div className="text-center py-16">
        <Lock
          size={48}
          className={`mx-auto mb-4 ${styles.bracketed}`} // Use theme style
        />
        <h2 className={`text-2xl font-bold mb-2 ${styles.text}`}>
          Premium Chapter
        </h2>
        <p className={`mb-8 ${styles.bracketed}`}>
          This chapter requires a subscription to read.
        </p>
        <button
          className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          onClick={() => alert('Subscription feature coming soon!')}
        >
          Subscribe to Unlock
        </button>
      </div>
    );
  }

  // Render editing or reading view
  return (
    <div className="w-full">
      <div className="max-w-4xl mx-auto px-4 md:px-8">
        {isEditing ? (
          <div className={cn(
            "border-2 border-dashed p-4 rounded-lg transition-colors",
            saving ? "opacity-50 cursor-not-allowed" : "",
            styles.editableBorder // Use theme-specific border
          )}>
            <div
              ref={editableDivRef}
              contentEditable={!saving} // Disable editing while saving
              suppressContentEditableWarning
              onBlur={handleBlur}
              // Use dangerouslySetInnerHTML ONLY IF you need to preserve initial HTML structure
              // Otherwise, set innerText in useEffect to manage as plain text
              // dangerouslySetInnerHTML={{ __html: content }}
              className={cn(
                "outline-none focus:ring-0 min-h-[400px]", // Increased min height
                styles.text,
                sizeClasses[textSize],
                "whitespace-pre-wrap", // Preserve whitespace and newlines
                "prose max-w-none", // Apply prose styling for consistency
                 saving ? "text-gray-500" : "" // Dim text when saving
              )}
              // style={{ lineHeight: 'inherit' }} // Inherit line height from parent
              role="textbox" // Improve accessibility
              aria-multiline="true"
            />
             {saving && <div className="text-sm text-center mt-2 text-theme-muted">Saving...</div>}
          </div>
        ) : (
          <div className={cn("prose max-w-none", sizeClasses[textSize], styles.text)}>
            {/* Render dynamic text using the dedicated component */}
            <DynamicText content={content} isEnabled={effectsEnabled} />
          </div>
        )}
      </div>
    </div>
  );
}