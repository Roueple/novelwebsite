// src/components/reading/reading-view.tsx
import { Lock } from 'lucide-react';
import { useTheme } from '@/providers/theme-provider';

interface ReadingViewProps {
  content: string;
  isLocked: boolean;
  isAuthor: boolean;
  isEditing: boolean;
  onContentChange?: (content: string) => void;
}

export default function ReadingView({
  content,
  isLocked,
  isAuthor,
  isEditing,
  onContentChange
}: ReadingViewProps) {
  const { theme } = useTheme();

  // Function to normalize content while preserving special formatting
  const normalizeContent = (text: string) => {
    return text
      .replace(/\r\n/g, '\n')  // Normalize line endings
      .replace(/\n{3,}/g, '\n\n')  // Reduce more than 2 consecutive newlines to double
      .trim();  // Remove leading/trailing whitespace
  };

  // Render method that preserves special formatting
  const renderContent = (text: string) => {
    const lines = text.split('\n');
    
    return lines.map((line, index) => {
      const isBracketed = line.startsWith('[') && line.endsWith(']');
      const isDialogue = line.startsWith('"') && line.endsWith('"');
      
      return (
        <p 
          key={index} 
          className={`
            mb-4 text-lg leading-relaxed 
            px-4 sm:px-6 md:px-0
            ${isBracketed ? 'italic text-theme-muted' : ''}
            ${isDialogue ? 'font-semibold' : ''}
            text-theme-foreground
          `}
        >
          {line}
        </p>
      );
    });
  };

  if (isLocked && !isAuthor) {
    return (
      <div className="text-center py-16 bg-theme-background px-4">
        <Lock 
          size={48} 
          className="mx-auto mb-4 text-theme-muted"
        />
        <h2 className="text-2xl font-bold mb-2 text-theme-foreground">
          Premium Chapter
        </h2>
        <p className="mb-8 text-theme-muted">
          This chapter is locked. Please subscribe to continue reading.
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

  return (
    <div className={`
      w-full max-w-4xl 
      mx-auto 
      reading-content 
      ${theme === 'reading' ? 'reading' : ''}
    `}>
      {isEditing ? (
        <textarea
          value={content}
          onChange={(e) => {
            const normalizedContent = normalizeContent(e.target.value);
            onContentChange?.(normalizedContent);
          }}
          rows={20}
          className="
            w-full 
            px-4 sm:px-6 md:px-0 
            py-2 
            rounded-lg 
            border 
            bg-theme-background 
            border-theme-border 
            text-theme-foreground 
            focus:border-red-500 
            focus:outline-none
          "
        />
      ) : (
        <div className={`
          prose 
          max-w-none 
          ${theme === 'reading' ? 'reading' : ''}
        `}>
          {renderContent(content)}
        </div>
      )}
    </div>
  );
}