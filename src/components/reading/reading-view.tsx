// src/components/reading/reading-view.tsx
import React from 'react';
import { Lock } from 'lucide-react';
import { useTheme } from '@/providers/theme-provider';

interface ReadingViewProps {
  content: string;
  isLocked: boolean;
  isAuthor: boolean;
  isEditing: boolean;
  textSize: 'sm' | 'md' | 'lg' | 'xl';
  onContentChange?: (content: string) => void;
}

export default function ReadingView({
  content,
  isLocked,
  isAuthor,
  isEditing,
  textSize,
  onContentChange
}: ReadingViewProps) {
  const { theme } = useTheme();

  const normalizeContent = (text: string) => {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  const getThemeStyles = () => {
    switch (theme) {
      case 'reading':
        return {
          text: 'text-[#2C3E50]',
          bracketed: 'text-[#8B4513]',
          dialogue: 'text-[#2C3E50] font-semibold',
          background: 'bg-[#F5E6D3]'
        };
      case 'dark':
        return {
          text: 'text-white',
          bracketed: 'text-gray-300',
          dialogue: 'text-gray-100 font-semibold',
          background: 'bg-[#1a1a1a]'
        };
      default:
        return {
          text: 'text-gray-900',
          bracketed: 'text-gray-600',
          dialogue: 'text-gray-800 font-semibold',
          background: 'bg-white'
        };
    }
  };

  const sizeClasses = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl',
    xl: 'text-2xl'
  };

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
            mb-6 
            leading-relaxed
            ${sizeClasses[textSize]}
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

  if (isLocked && !isAuthor) {
    const styles = getThemeStyles();
    return (
      <div className="text-center py-16">
        <Lock 
          size={48} 
          className={`mx-auto mb-4 ${
            theme === 'reading' 
              ? 'text-[#8B4513]' 
              : theme === 'dark'
                ? 'text-gray-300' 
                : 'text-gray-500'
          }`} 
        />
        <h2 className={`text-2xl font-bold mb-2 ${styles.text}`}>
          Premium Chapter
        </h2>
        <p className={`mb-8 ${styles.bracketed}`}>
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

  const styles = getThemeStyles();
  return (
    <div className="w-full">
      {isEditing ? (
        <div className="max-w-4xl
                        mx-auto 
                        px-4 
                        md:px-8">
          <textarea
            value={content}
            onChange={(e) => {
              const normalizedContent = normalizeContent(e.target.value);
              onContentChange?.(normalizedContent);
            }}
            rows={20}
            className={`
              w-full 
              px-4
              py-2 
              rounded-lg 
              border 
              ${styles.text}
              border-theme-border 
              focus:border-red-500 
              focus:outline-none
              ${styles.background}
              resize-y
            `}
          />
        </div>
      ) : (
        <div className={`
          max-w-4xl
  mx-auto 
  px-4 
  md:px-8
        `}>
          {renderContent(content)}
        </div>
      )}
    </div>
  );
}