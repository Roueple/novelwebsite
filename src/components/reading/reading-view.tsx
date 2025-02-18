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

  // Determine theme-specific container styles
  const getContainerStyles = () => {
    switch (theme) {
      case 'reading':
        return {
          container: 'bg-[#F5E6D3] text-[#2C3E50]',
          text: 'text-[#2C3E50]',
          bracketed: 'text-[#8B4513]',
          dialogue: 'text-[#2C3E50] font-semibold'
        };
      case 'dark':
        return {
          container: 'bg-gray-800 text-gray-100',
          text: 'text-gray-100',
          bracketed: 'text-gray-400',
          dialogue: 'text-gray-200 font-semibold'
        };
      default: // light theme
        return {
          container: 'bg-gray-100 text-gray-900',
          text: 'text-gray-900',
          bracketed: 'text-gray-600',
          dialogue: 'text-gray-800 font-semibold'
        };
    }
  };

  // Render method that preserves special formatting
  const renderContent = (text: string) => {
    const styles = getContainerStyles();
    const lines = text.split('\n');
    
    return lines.map((line, index) => {
      const isBracketed = line.startsWith('[') && line.endsWith(']');
      const isDialogue = line.startsWith('"') && line.endsWith('"');
      
      return (
        <p 
          key={index} 
          className={`
            mb-4 text-lg leading-relaxed
            ${isBracketed ? styles.bracketed : ''}
            ${isDialogue ? styles.dialogue : ''}
            ${styles.text}
          `}
        >
          {line}
        </p>
      );
    });
  };

  const containerStyles = getContainerStyles();

  if (isLocked && !isAuthor) {
    return (
      <div className={`text-center py-16 ${containerStyles.container}`}>
        <Lock 
          size={48} 
          className={`mx-auto mb-4 ${
            theme === 'reading' 
              ? 'text-[#8B4513]' 
              : theme === 'dark'
                ? 'text-gray-400'
                : 'text-gray-500'
          }`} 
        />
        <h2 className={`text-2xl font-bold mb-2 ${containerStyles.text}`}>
          Premium Chapter
        </h2>
        <p className={`mb-8 ${containerStyles.bracketed}`}>
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
      w-full 
      max-w-4xl 
      mx-auto 
      reading-content 
      p-6 
      rounded-lg 
      shadow-md 
      ${containerStyles.container}
    `}>
      {isEditing ? (
        <textarea
          value={content}
          onChange={(e) => {
            const normalizedContent = normalizeContent(e.target.value);
            onContentChange?.(normalizedContent);
          }}
          rows={20}
          className={`
            w-full 
            py-2 
            rounded-lg 
            border 
            ${containerStyles.container}
            border-theme-border 
            focus:border-red-500 
            focus:outline-none
          `}
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