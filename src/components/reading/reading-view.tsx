// src/components/reading/reading-view.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Lock, ChevronDown } from 'lucide-react';
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
  const [textSize, setTextSize] = useState<'sm' | 'md' | 'lg' | 'xl'>('md');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Retrieve text size from localStorage on component mount
  useEffect(() => {
    const savedTextSize = localStorage.getItem('readingTextSize') as 'sm' | 'md' | 'lg' | 'xl';
    if (savedTextSize) {
      setTextSize(savedTextSize);
    }

    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle text size change
  const changeTextSize = (size: 'sm' | 'md' | 'lg' | 'xl') => {
    setTextSize(size);
    localStorage.setItem('readingTextSize', size);
    setIsDropdownOpen(false);
  };

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
    
    // Determine text size classes
    const sizeClasses = {
      sm: 'text-base',
      md: 'text-lg',
      lg: 'text-xl',
      xl: 'text-2xl'
    };

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

  const containerStyles = getContainerStyles();

  // Text size label
  const textSizeLabel = {
    sm: 'Small',
    md: 'Medium',
    lg: 'Large',
    xl: 'Extra Large'
  };

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
    <div className="relative max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
      {/* Text Size Controls */}
      <div className="absolute top-0 right-0 z-10" ref={dropdownRef}>
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-theme-background border border-theme-border text-theme-foreground"
          >
            {textSizeLabel[textSize]} <ChevronDown size={16} />
          </button>
          
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-theme-background border border-theme-border rounded-lg shadow-lg">
              {(['sm', 'md', 'lg', 'xl'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => changeTextSize(size)}
                  className={`
                    w-full 
                    text-left 
                    px-4 
                    py-2 
                    hover:bg-theme-hover
                    ${textSize === size 
                      ? 'bg-red-600 text-white' 
                      : 'text-theme-foreground'
                    }
                  `}
                >
                  {textSizeLabel[size]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={`
        w-full 
        mx-auto 
        reading-content 
        p-6 
        sm:p-8 
        rounded-xl  
        shadow-lg 
        relative
        mt-12  
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
    </div>
  );
}