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
      
      // Additional styling for reading mode
      const lineStyles = theme === 'reading' 
        ? {
            bracketed: 'italic text-[var(--reading-muted)]',
            dialogue: 'text-[var(--reading-foreground)] font-semibold',
            base: 'text-[var(--reading-foreground)] leading-relaxed'
          }
        : {
            bracketed: 'italic text-theme-muted',
            dialogue: theme === 'dark' 
              ? 'text-gray-200' 
              : 'text-gray-700',
            base: 'text-theme-foreground leading-relaxed'
          };

      return (
        <p 
          key={index} 
          className={`
            mb-4 text-lg 
            ${isBracketed ? lineStyles.bracketed : ''}
            ${isDialogue ? lineStyles.dialogue : ''}
            ${lineStyles.base}
          `}
        >
          {line}
        </p>
      );
    });
  };

  if (isLocked && !isAuthor) {
    return (
      <div className={`text-center py-16 ${theme === 'reading' ? 'bg-[var(--reading-background)] text-[var(--reading-foreground)]' : ''}`}>
        <Lock 
          size={48} 
          className={`mx-auto mb-4 ${
            theme === 'reading' 
              ? 'text-[var(--reading-muted)]' 
              : 'text-theme-muted'
          }`} 
        />
        <h2 className={`text-2xl font-bold mb-2 ${
          theme === 'reading' 
            ? 'text-[var(--reading-foreground)]' 
            : 'text-theme-foreground'
        }`}>
          Premium Chapter
        </h2>
        <p className={`mb-8 ${
          theme === 'reading' 
            ? 'text-[var(--reading-muted)]' 
            : 'text-theme-muted'
        }`}>
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
    <div className={`reading-content ${theme === 'reading' ? 'reading' : ''}`}>
      {isEditing ? (
        <textarea
          value={content}
          onChange={(e) => {
            const normalizedContent = normalizeContent(e.target.value);
            onContentChange?.(normalizedContent);
          }}
          rows={20}
          className={`w-full px-4 py-2 rounded-lg border 
            ${theme === 'reading' 
              ? 'bg-[var(--reading-background)] border-[var(--reading-muted)] text-[var(--reading-foreground)]'
              : 'bg-theme-background border-theme-border text-theme-foreground'
            } 
            focus:border-red-500 
            focus:outline-none`}
        />
      ) : (
        <div className={`prose max-w-none ${theme === 'reading' ? 'reading' : ''}`}>
          {renderContent(content)}
        </div>
      )}
    </div>
  );
}