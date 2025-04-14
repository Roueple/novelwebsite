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
  BookOpen,
  X // Import X for cancel icon
} from 'lucide-react';
import { useTheme } from '@/providers/theme-provider';
import { NovelType, ChapterType } from '@/types/supabase';
import { Button } from '@/components/ui/button'; // Import Button component

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
  onCancelEdit: () => void; // <-- Add the new prop definition
  saving?: boolean; // Add saving prop to disable buttons
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
  onLockToggle,
  onCancelEdit, // Use the prop
  saving = false // Default saving to false
}: HeaderProps) {
  const { theme, cycleTheme } = useTheme();

  // Simple hide button (remains the same)
  if (!visible) {
    return (
      <button
        onClick={() => setVisible(true)}
        className="fixed top-2 left-1/2 transform -translate-x-1/2 p-2 rounded-full bg-theme-card bg-opacity-60 shadow-md text-theme-foreground z-50 hover:bg-opacity-80"
        aria-label="Show Header"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
          <path fillRule="evenodd" d="M7.646 4.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 5.707l-5.646 5.647a.5.5 0 0 1-.708-.708z"/>
        </svg>
      </button>
    );
  }

  // Full header (add Cancel button)
  return (
    <header className="bg-theme-background border-b border-theme-border text-theme-foreground sticky top-0 z-50 transition-opacity duration-300">
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
            <Button
                variant="ghost"
                size="icon"
                onClick={cycleTheme}
                aria-label="Toggle theme"
                className="w-8 h-8"
            >
                {theme === 'light' ? (
                <Sun size={18} />
                ) : theme === 'dark' ? (
                <Moon size={18} />
                ) : (
                <BookOpen size={18} />
                )}
            </Button>

            {/* Effects toggle - Needs state passed down or managed via context/hook */}
             {/* For now, just show icon based on prop */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => console.log("Effects toggle clicked - needs implementation")} // Placeholder
              aria-label={effectsEnabled ? 'Disable text effects' : 'Enable text effects'}
              className="w-8 h-8"
            >
              {effectsEnabled ? (
                <Sparkles size={18} className="text-yellow-500" />
              ) : (
                <EyeOff size={18} />
              )}
            </Button>

            {/* Settings */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettingsMenu(!showSettingsMenu)}
              aria-label="Reading settings"
              className={`w-8 h-8 ${showSettingsMenu ? 'bg-theme-hover' : ''}`}
            >
              <Settings size={18} />
            </Button>
          </div>

          {/* Right section - Author Controls */}
          {isAuthor && (
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  {/* Cancel Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onCancelEdit} // Use the passed handler
                    disabled={saving} // Disable while saving
                  >
                    <X size={16} className="mr-1" />
                    Cancel
                  </Button>
                  {/* Save Button */}
                  <Button
                    size="sm"
                    onClick={onSave}
                    disabled={saving} // Disable while saving
                    className="bg-red-600 text-white hover:bg-red-700"
                  >
                    <Save size={16} className="mr-1" />
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                </>
              ) : (
                 // Edit Button
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onEdit}
                    disabled={saving} // Disable if saving is stuck? (edge case)
                >
                  <Edit size={16} className="mr-1" />
                  Edit
                </Button>
              )}

              {/* Lock Toggle Button (Only show when NOT editing) */}
              {!isEditing && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onLockToggle}
                  disabled={saving} // Disable if related save is happening?
                  className={`w-8 h-8 ${
                    isLocked ? 'text-red-500 hover:bg-red-100' : 'text-green-500 hover:bg-green-100'
                  }`}
                  aria-label={isLocked ? 'Unlock chapter' : 'Lock chapter'}
                >
                  {isLocked ? <Lock size={16} /> : <Unlock size={16} />}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}