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

  // Determine theme-specific styles
  const getThemeStyles = () => {
    switch (theme) {
      case 'reading':
        return {
          base: 'text-[var(--reading-foreground)] leading-relaxed',
          bracketed: 'italic text-[var(--reading-muted)]',
          dialogue: 'font-semibold text-[var(--reading-foreground)]',
          background: 'bg-[var(--reading-background)]',
          border: 'border-[var(--reading-muted)]'
        };
      case 'dark':
        return {
          base: 'text-gray-200 leading-relaxed',
          bracketed: 'italic text-gray-400',
          dialogue: 'font-semibold text-gray-100',
          background: 'bg-gray-900',
          border: 'border-gray-700'
        };
      default: // light theme
        return {
          base: 'text-gray-800 leading-relaxed',
          bracketed: 'italic text-gray-500',
          dialogue: 'font-semibold text-gray-900',
          background: 'bg-white',
          border: 'border-gray-300'
        };
    }
  };

  // Render method that preserves special formatting
  const renderContent = (text: string) => {
    const styles = getThemeStyles();
    const lines = text.split('\n');
    
    return lines.map((line, index) => {
      const isBracketed = line.startsWith('[') && line.endsWith(']');
      const isDialogue = line.startsWith('"') && line.endsWith('"');
      
      return (
        <p 
          key={index} 
          className={`
            mb-4 text-lg 
            ${isBracketed ? styles.bracketed : ''}
            ${isDialogue ? styles.dialogue : ''}
            ${styles.base}
          `}
        >
          {line}
        </p>
      );
    });
  };

  const styles = getThemeStyles();

  if (isLocked && !isAuthor) {
    return (
      <div className={`text-center py-16 ${styles.background}`}>
        <Lock 
          size={48} 
          className={`mx-auto mb-4 ${
            theme === 'reading' 
              ? 'text-[var(--reading-muted)]' 
              : theme === 'dark'
                ? 'text-gray-400'
                : 'text-gray-500'
          }`} 
        />
        <h2 className={`text-2xl font-bold mb-2 ${
          theme === 'reading' 
            ? 'text-[var(--reading-foreground)]' 
            : theme === 'dark'
              ? 'text-gray-100'
              : 'text-gray-900'
        }`}>
          Premium Chapter
        </h2>
        <p className={`mb-8 ${
          theme === 'reading' 
            ? 'text-[var(--reading-muted)]' 
            : theme === 'dark'
              ? 'text-gray-400'
              : 'text-gray-600'
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
            ${styles.background} 
            ${styles.border} 
            ${styles.base}
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