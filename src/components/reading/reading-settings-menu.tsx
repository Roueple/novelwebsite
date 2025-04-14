// src/components/reading/reading-settings-menu.tsx
"use client";

import React, { RefObject } from 'react';
import { useTheme } from '@/providers/theme-provider';
import { 
  Settings, 
  Type, 
  Sparkles, 
  Book, 
  Moon, 
  Sun, 
  X,
  Minus,
  Plus,
  RefreshCw
} from 'lucide-react';

interface ReadingSettingsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  // Accept the correct type of ref
  menuRef: RefObject<HTMLDivElement>;
  textSize: 'sm' | 'md' | 'lg' | 'xl';
  onChangeTextSize: (size: 'sm' | 'md' | 'lg' | 'xl') => void;
  effectsEnabled: boolean;
  onToggleEffects: () => void;
  animationsEnabled: boolean;
  onToggleAnimations: () => void;
  fontFamily: string;
  onChangeFontFamily: (font: string) => void;
  lineSpacing: number;
  onChangeLineSpacing: (spacing: number) => void;
  onResetPreferences: () => void;
}

const TEXT_SIZE_LABELS = {
  sm: 'Small',
  md: 'Medium',
  lg: 'Large',
  xl: 'Extra Large'
};

const AVAILABLE_FONTS = [
  { name: 'Serif', value: 'serif' },
  { name: 'Sans-serif', value: 'sans-serif' },
  { name: 'Merriweather', value: 'var(--font-merriweather)' },
  { name: 'Roboto Slab', value: 'var(--font-roboto-slab)' },
  { name: 'Libre Baskerville', value: 'var(--font-libre-baskerville)' },
  { name: 'Source Sans', value: 'var(--font-source-sans)' },
  { name: 'Open Sans', value: 'var(--font-open-sans)' },
];

export default function ReadingSettingsMenu({
  isOpen,
  onClose,
  menuRef,
  textSize,
  onChangeTextSize,
  effectsEnabled,
  onToggleEffects,
  animationsEnabled,
  onToggleAnimations,
  fontFamily,
  onChangeFontFamily,
  lineSpacing,
  onChangeLineSpacing,
  onResetPreferences,
}: ReadingSettingsMenuProps) {
  const { theme, cycleTheme } = useTheme();

  if (!isOpen) return null;

  return (
    <div 
      ref={menuRef}
      className="fixed top-16 right-4 w-72 bg-theme-card border border-theme-border rounded-lg shadow-lg z-50 overflow-hidden"
    >
      <div className="flex justify-between items-center px-4 py-3 border-b border-theme-border">
        <div className="flex items-center gap-2">
          <Settings size={18} className="text-theme-muted" />
          <h3 className="font-medium text-theme-foreground">Reading Settings</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-theme-hover"
          aria-label="Close settings"
        >
          <X size={18} />
        </button>
      </div>

      <div className="max-h-[80vh] overflow-y-auto">
        {/* Text Size Settings */}
        <div className="px-4 py-3 border-b border-theme-border">
          <div className="flex items-center gap-2 mb-2">
            <Type size={16} className="text-theme-muted" />
            <h4 className="text-sm font-medium text-theme-foreground">Text Size</h4>
          </div>
          <div className="flex flex-col gap-1">
            {(['sm', 'md', 'lg', 'xl'] as const).map((size) => (
              <button
                key={size}
                onClick={() => onChangeTextSize(size)}
                className={`
                  w-full text-left px-3 py-2 text-sm rounded
                  ${textSize === size 
                    ? 'bg-theme-hover font-medium' 
                    : 'hover:bg-theme-hover/50'
                  }
                `}
              >
                {TEXT_SIZE_LABELS[size]}
              </button>
            ))}
          </div>
        </div>

        {/* Rest of the component remains unchanged */}
        {/* Font Family Settings */}
        <div className="px-4 py-3 border-b border-theme-border">
          <div className="flex items-center gap-2 mb-2">
            <Book size={16} className="text-theme-muted" />
            <h4 className="text-sm font-medium text-theme-foreground">Font</h4>
          </div>
          <div className="flex flex-col gap-1">
            {AVAILABLE_FONTS.map((font) => (
              <button
                key={font.value}
                onClick={() => onChangeFontFamily(font.value)}
                className={`
                  w-full text-left px-3 py-2 text-sm rounded
                  ${fontFamily === font.value 
                    ? 'bg-theme-hover font-medium' 
                    : 'hover:bg-theme-hover/50'
                  }
                `}
                style={{ fontFamily: font.value }}
              >
                {font.name}
              </button>
            ))}
          </div>
        </div>

        {/* Line Spacing */}
        <div className="px-4 py-3 border-b border-theme-border">
          <div className="flex items-center gap-2 mb-2">
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              className="text-theme-muted"
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
            <h4 className="text-sm font-medium text-theme-foreground">Line Spacing</h4>
          </div>
          <div className="flex items-center gap-4 mt-2">
            <button 
              onClick={() => onChangeLineSpacing(Math.max(1, lineSpacing - 0.1))}
              className="p-1 rounded hover:bg-theme-hover"
              disabled={lineSpacing <= 1}
            >
              <Minus size={16} />
            </button>
            <div className="flex-1 text-center">
              <span className="text-sm">{lineSpacing.toFixed(1)}</span>
            </div>
            <button 
              onClick={() => onChangeLineSpacing(Math.min(3, lineSpacing + 0.1))}
              className="p-1 rounded hover:bg-theme-hover"
              disabled={lineSpacing >= 3}
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Text Effects Toggle */}
        <div className="px-4 py-3 border-b border-theme-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-theme-muted" />
              <span className="text-sm text-theme-foreground">Dynamic Text Effects</span>
            </div>
            <button 
              onClick={onToggleEffects}
              className={`w-10 h-5 rounded-full relative ${
                effectsEnabled ? 'bg-green-500' : 'bg-gray-400'
              }`}
            >
              <span 
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                  effectsEnabled ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>
        </div>

        {/* Animations Toggle */}
        <div className="px-4 py-3 border-b border-theme-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                className="text-theme-muted"
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M5 15V9" />
                <path d="M12 20V4" />
                <path d="M19 15V9" />
              </svg>
              <span className="text-sm text-theme-foreground">Animations</span>
            </div>
            <button 
              onClick={onToggleAnimations}
              className={`w-10 h-5 rounded-full relative ${
                animationsEnabled ? 'bg-green-500' : 'bg-gray-400'
              }`}
            >
              <span 
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                  animationsEnabled ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>
        </div>

        {/* Theme Settings */}
        <div className="px-4 py-3 border-b border-theme-border">
          <div className="flex items-center gap-2 mb-2">
            {theme === 'dark' ? (
              <Moon size={16} className="text-theme-muted" />
            ) : theme === 'reading' ? (
              <Book size={16} className="text-theme-muted" />
            ) : (
              <Sun size={16} className="text-theme-muted" />
            )}
            <h4 className="text-sm font-medium text-theme-foreground">Theme</h4>
          </div>
          <button 
            onClick={cycleTheme}
            className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm rounded hover:bg-theme-hover/50"
          >
            <span className="w-4 h-4 flex items-center justify-center">
              {theme === 'dark' ? (
                <Moon size={16} />
              ) : theme === 'reading' ? (
                <Book size={16} />
              ) : (
                <Sun size={16} />
              )}
            </span>
            <span>
              {theme === 'light' 
                ? 'Light Mode' 
                : theme === 'dark' 
                ? 'Dark Mode' 
                : 'Reading Mode'}
            </span>
          </button>
        </div>

        {/* Reset Settings */}
        <div className="px-4 py-3">
          <button
            onClick={onResetPreferences}
            className="flex items-center gap-2 text-sm text-theme-muted hover:text-theme-foreground"
          >
            <RefreshCw size={16} />
            <span>Reset to Default Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}