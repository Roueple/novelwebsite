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
    <div className={`max-w-3xl mx-auto ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
      {isEditing ? (
        <textarea
          value={content}
          onChange={(e) => onContentChange?.(e.target.value)}
          rows={20}
          className={`w-full px-4 py-2 rounded-lg border ${
            isDark 
              ? 'bg-gray-800 border-gray-700 text-white' 
              : 'bg-white border-gray-300 text-gray-900'
          }`}
        />
      ) : (
        <div className="reading-content">
          {content?.split('\n\n').map((paragraph, index) => (
            <p 
              key={index} 
              className={`mb-6 text-lg leading-relaxed ${
                isDark ? 'text-gray-300' : 'text-gray-800'
              }`}
              style={{ 
                textIndent: '2rem',  // Indent first line of each paragraph
                lineHeight: 1.8,     // Increased line height for better readability
                wordBreak: 'break-word', // Prevent overflow of long words
                hyphens: 'auto'      // Allow hyphenation for better text flow
              }}
            >
              {paragraph}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}