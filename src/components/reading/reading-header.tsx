// src/components/reading/reading-header.tsx
import React from 'react';
import Link from 'next/link';
import { 
  ChevronLeft, 
  Settings, 
  Edit, 
  Save, 
  Lock, 
  Unlock,
  Sparkles,
  EyeOff,
  Moon,
  Sun,
  BookOpen
} from 'lucide-react';
import { useTheme } from '@/providers/theme-provider';
import { NovelType, ChapterType } from '@/types/supabase';

interface HeaderProps {
  novel: NovelType;
  chapter: ChapterType;
  isAuthor: boolean;
  isEditing: boolean;
  isLocked: boolean;
  visible: boolean;
  setVisible: (visible: boolean) => void;
  textSize: 'sm' | 'md' | 'lg' | 'xl';
  effectsEnabled: boolean;
  showSettingsMenu: boolean;
  setShowSettingsMenu: (show: boolean) => void;
  onEdit: () => void;
  onSave: () => void;
  onLockToggle: () => void;
}

export default function ReadingHeader({
  novel,
  chapter,
  isAuthor,
  isEditing,
  isLocked,
  visible,
  setVisible,
  textSize,
  effectsEnabled,
  showSettingsMenu,
  setShowSettingsMenu,
  onEdit,
  onSave,
  onLockToggle
}: HeaderProps) {
  const { theme, cycleTheme } = useTheme();

  if (!visible) {
    return (
      <button
        onClick={() => setVisible(true)}
        className="fixed top-2 left-1/2 transform -translate-x-1/2 p-2 rounded-full bg-theme-card bg-opacity-60 shadow-md text-theme-foreground z-50"
      >
        ⌄
      </button>
    );
  }

  return (
    <header className="bg-theme-background border-b border-theme-border text-theme-foreground sticky top-0 z-50 transition-all duration-300">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-3">
          {/* Left section - Back and Novel Info */}
          <div className="flex items-center gap-4">
            <Link
              href={`/novels/${novel.id}`}
              className="p-2 rounded-lg hover:bg-theme-hover"
              aria-label="Back to novel"
            >
              <ChevronLeft size={20} />
            </Link>
            
            <div className="hidden md:block">
              <h1 className="text-sm font-medium truncate max-w-xs">
                {novel.title}
              </h1>
              <p className="text-xs text-theme-muted">
                Chapter {chapter.chapter_number}
              </p>
            </div>
          </div>

          {/* Center - Reading Controls */}
          <div className="flex items-center gap-2">
            {/* Theme toggler */}
            <button
              onClick={cycleTheme}
              className="p-2 rounded-lg hover:bg-theme-hover"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <Sun size={18} />
              ) : theme === 'dark' ? (
                <Moon size={18} />
              ) : (
                <BookOpen size={18} />
              )}
            </button>
            
            {/* Effects toggle */}
            <button
              onClick={() => {/* Toggle effects */}}
              className="p-2 rounded-lg hover:bg-theme-hover"
              aria-label={effectsEnabled ? 'Disable text effects' : 'Enable text effects'}
            >
              {effectsEnabled ? (
                <Sparkles size={18} className="text-yellow-500" />
              ) : (
                <EyeOff size={18} />
              )}
            </button>
            
            {/* Settings */}
            <button
              onClick={() => setShowSettingsMenu(!showSettingsMenu)}
              className={`p-2 rounded-lg hover:bg-theme-hover ${
                showSettingsMenu ? 'bg-theme-hover' : ''
              }`}
              aria-label="Reading settings"
            >
              <Settings size={18} />
            </button>
          </div>

          {/* Right section - Author Controls */}
          {isAuthor && (
            <div className="flex items-center gap-2">
              {isEditing ? (
                <button
                  onClick={onSave}
                  className="flex items-center gap-1 px-3 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700"
                >
                  <Save size={16} />
                  <span className="text-sm">Save</span>
                </button>
              ) : (
                <button
                  onClick={onEdit}
                  className="flex items-center gap-1 px-3 py-1 rounded-lg hover:bg-theme-hover"
                >
                  <Edit size={16} />
                  <span className="text-sm">Edit</span>
                </button>
              )}
              
              <button
                onClick={onLockToggle}
                className={`p-2 rounded-lg hover:bg-theme-hover ${
                  isLocked ? 'text-red-500' : 'text-green-500'
                }`}
                aria-label={isLocked ? 'Unlock chapter' : 'Lock chapter'}
              >
                {isLocked ? <Lock size={16} /> : <Unlock size={16} />}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}