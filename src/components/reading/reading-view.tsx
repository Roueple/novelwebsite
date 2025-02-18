// src/components/reading/reading-view.tsx
import React, { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';
import { useTheme } from '@/providers/theme-provider';

interface ReadingViewProps {
  content: string;
  isLocked: boolean;
  isAuthor: boolean;
  isEditing: boolean;
  initialTextSize?: 'sm' | 'md' | 'lg' | 'xl';
  onContentChange?: (content: string) => void;
}

export default function ReadingView({
  content,
  isLocked,
  isAuthor,
  isEditing,
  initialTextSize = 'md',
  onContentChange
}: ReadingViewProps) {
  const { theme } = useTheme();
  const [textSize, setTextSize] = useState<'sm' | 'md' | 'lg' | 'xl'>(initialTextSize);

  // Persist and sync text size
  useEffect(() => {
    const savedTextSize = localStorage.getItem('readingTextSize') as 'sm' | 'md' | 'lg' | 'xl';
    if (savedTextSize) {
      setTextSize(savedTextSize);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('readingTextSize', textSize);
  }, [textSize]);

  // Normalize content function
  const normalizeContent = (text: string) => {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  // Theme-specific styles
  const getThemeStyles = () => {
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
      default:
        return {
          container: 'bg-gray-100 text-gray-900',
          text: 'text-gray-900',
          bracketed: 'text-gray-600',
          dialogue: 'text-gray-800 font-semibold'
        };
    }
  };

  // Text size classes
  const sizeClasses = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl',
    xl: 'text-2xl'
  };

  // Render content with special formatting
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

  // Locked content view
  if (isLocked && !isAuthor) {
    const styles = getThemeStyles();
    return (
      <div className={`text-center py-16 ${styles.container}`}>
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

  // Main content view
  const styles = getThemeStyles();
  return (
    <div className="w-full">
      <div className={`
        w-full 
        max-w-[900px]  
        mx-auto 
        reading-content 
        p-4 
        sm:p-6 
        rounded-xl  
        shadow-lg 
        ${styles.container}
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
              ${styles.container}
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
    </div>
  );
}