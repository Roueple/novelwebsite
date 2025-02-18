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
  const isDark = theme === 'dark';

  // Function to normalize content while preserving special formatting
  const normalizeContent = (text: string) => {
    // Preserve multiple consecutive newlines for special formatting
    return text
      .replace(/\r\n/g, '\n')  // Normalize line endings
      .replace(/\n{3,}/g, '\n\n')  // Reduce more than 2 consecutive newlines to double
      .trim();  // Remove leading/trailing whitespace
  };

  // Render method that preserves special formatting
  const renderContent = (text: string) => {
    // Split content into lines
    const lines = text.split('\n');
    
    return lines.map((line, index) => {
      // Check for special formatting
      const isBracketed = line.startsWith('[') && line.endsWith(']');
      const isDialogue = line.startsWith('"') && line.endsWith('"');
      
      return (
        <p 
          key={index} 
          className={`
            ${isBracketed ? 'italic text-gray-500' : ''}
            ${isDialogue ? 'text-gray-600' : ''}
            mb-4 text-lg leading-relaxed
            ${isDark ? 'text-gray-300' : 'text-gray-800'}
          `}
        >
          {line}
        </p>
      );
    });
  };

  if (isLocked && !isAuthor) {
    return (
      <div className="text-center py-16">
        <Lock size={48} className={`mx-auto mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
        <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Premium Chapter
        </h2>
        <p className={`mb-8 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
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
    <div className={`reading-content ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
      {isEditing ? (
        <textarea
          value={content}
          onChange={(e) => {
            const normalizedContent = normalizeContent(e.target.value);
            onContentChange?.(normalizedContent);
          }}
          rows={20}
          className={`w-full px-4 py-2 rounded-lg border ${
            isDark 
              ? 'bg-gray-800 border-gray-700 text-white' 
              : 'bg-white border-gray-300 text-gray-900'
          }`}
        />
      ) : (
        <div className="prose max-w-none">
          {renderContent(content)}
        </div>
      )}
    </div>
  );
}