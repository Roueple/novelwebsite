// src/app/novels/[id]/chapter/[chapterId]/page.tsx
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { getChapter, getNovel } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import Header from '@/components/header';
import ReadingView from '@/components/reading/reading-view';
import ChapterNavigation from '@/components/reading/chapter-navigation';
import ReadingSettingsMenu from '@/components/reading/reading-settings-menu';
import LoadingScreen from '@/components/ui/loading-screen';
import NotFoundScreen from '@/components/ui/not-found-screen';
import { useReadingPreferences } from '@/hooks/use-reading-preferences';
import { useChapterActions } from '@/hooks/use-chapter-actions';
import type { ChapterType, NovelType } from '@/types/supabase';

export default function ChapterPage() {
  const { user, role } = useAuth();
  const { theme } = useTheme();
  const params = useParams();
  const novelId = Number(params.id);
  const chapterNumber = Number(params.chapterId);
  
  // State management
  const [loading, setLoading] = useState(true);
  const [chapter, setChapter] = useState<ChapterType | null>(null);
  const [novel, setNovel] = useState<NovelType | null>(null);
  const [headerVisible, setHeaderVisible] = useState(true);
  
  // Custom hooks for preferences and actions
  const { 
    textSize, 
    effectsEnabled,
    animationsEnabled,
    fontFamily,
    lineSpacing,
    showSettingsMenu, 
    settingsMenuRef,
    setShowSettingsMenu,
    changeTextSize,
    toggleEffects,
    toggleAnimations,
    changeFontFamily,
    changeLineSpacing,
    resetPreferences
  } = useReadingPreferences();

  const {
    isAuthor,
    isEditing,
    setIsEditing,
    isLocked,
    setIsLocked,
    editedTitle,
    setEditedTitle,
    editedContent,
    setEditedContent,
    saving,
    handleSave,
    handleLockToggle
  } = useChapterActions(chapter, user, role, setChapter, novel);

  // Load chapter data on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [chapterData, novelData] = await Promise.all([
          getChapter(novelId, chapterNumber),
          getNovel(novelId)
        ]);
  
        if (chapterData && novelData) {
          setChapter(chapterData);
          setNovel(novelData);
          setEditedTitle(chapterData.title);
          setEditedContent(chapterData.content || '');
          setIsLocked(chapterData.is_locked);
  
          const isAdmin = role === 'admin';
          const isNovelAuthor = novelData.author_id === user?.id;
          
          // Show editing UI for new chapters created by author
          if (chapterData.newly_created && (isAdmin || isNovelAuthor)) {
            setIsEditing(true);
          }
        }
      } catch (error) {
        console.error('Error loading chapter:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [novelId, chapterNumber, user, role, setEditedTitle, setEditedContent, setIsLocked, setIsEditing]);

  // Apply reading preferences to document
  useEffect(() => {
    // Apply animation preferences
    if (!animationsEnabled) {
      document.documentElement.classList.add('disable-animations');
    } else {
      document.documentElement.classList.remove('disable-animations');
    }

    // Apply line spacing
    document.documentElement.style.setProperty('--reading-line-height', lineSpacing.toString());

    // Apply font family
    if (fontFamily) {
      document.documentElement.style.setProperty('--reading-font-family', fontFamily);
    }

    return () => {
      // Clean up when component unmounts
      document.documentElement.classList.remove('disable-animations');
      document.documentElement.style.removeProperty('--reading-line-height');
      document.documentElement.style.removeProperty('--reading-font-family');
    };
  }, [animationsEnabled, lineSpacing, fontFamily]);

  // Create page class based on preferences
  const pageClasses = useMemo(() => {
    const classes = ['reading-page'];
    
    if (!animationsEnabled) {
      classes.push('disable-animations');
    }
    
    return classes.join(' ');
  }, [animationsEnabled]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC to close settings menu
      if (e.key === 'Escape' && showSettingsMenu) {
        setShowSettingsMenu(false);
        return;
      }

      // Settings menu toggle (S key)
      if (e.key === 's' && !isEditing && !e.ctrlKey && !e.metaKey) {
        setShowSettingsMenu(prev => !prev);
        return;
      }

      // Text size shortcuts
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          if (textSize === 'sm') changeTextSize('md');
          else if (textSize === 'md') changeTextSize('lg');
          else if (textSize === 'lg') changeTextSize('xl');
        } else if (e.key === '-') {
          e.preventDefault();
          if (textSize === 'xl') changeTextSize('lg');
          else if (textSize === 'lg') changeTextSize('md');
          else if (textSize === 'md') changeTextSize('sm');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showSettingsMenu, isEditing, textSize, setShowSettingsMenu, changeTextSize]);

  // Memoize chapter navigation to prevent recalculation
  const { prevChapter, nextChapter } = useMemo(() => {
    if (!novel) return { prevChapter: null, nextChapter: null };
    
    const chapterList = novel.chapters.sort((a, b) => a.chapter_number - b.chapter_number);
    const currentIndex = chapterList.findIndex(ch => ch.chapter_number === chapterNumber);
    
    return {
      prevChapter: currentIndex > 0 ? chapterList[currentIndex - 1] : null,
      nextChapter: currentIndex < chapterList.length - 1 ? chapterList[currentIndex + 1] : null
    };
  }, [novel, chapterNumber]);

  // Loading state
  if (loading) {
    return <LoadingScreen message="Loading chapter..." />;
  }

  // Error/Not found state
  if (!chapter || !novel) {
    return <NotFoundScreen message="Chapter not found" returnUrl={`/novels/${novelId}`} />;
  }

  return (
    <div className={pageClasses}>
      <main 
        className="min-h-screen bg-theme-background"
        style={{ 
          fontFamily: `var(--reading-font-family, ${fontFamily})`,
          lineHeight: `${lineSpacing}` 
        }}
      >
        {/* Header with chapter info and controls */}
        <Header 
          novel={novel}
          chapter={chapter}
          isAuthor={isAuthor}
          isEditing={isEditing}
          isLocked={isLocked}
          visible={headerVisible}
          setVisible={setHeaderVisible}
          textSize={textSize}
          effectsEnabled={effectsEnabled}
          showSettingsMenu={showSettingsMenu}
          setShowSettingsMenu={setShowSettingsMenu}
          onEdit={() => setIsEditing(true)}
          onSave={handleSave}
          onLockToggle={handleLockToggle}
        />

        {/* Reading Settings Menu */}
        <ReadingSettingsMenu 
          isOpen={showSettingsMenu}
          onClose={() => setShowSettingsMenu(false)}
          menuRef={settingsMenuRef}
          textSize={textSize}
          onChangeTextSize={changeTextSize}
          effectsEnabled={effectsEnabled}
          onToggleEffects={toggleEffects}
          animationsEnabled={animationsEnabled}
          onToggleAnimations={toggleAnimations}
          fontFamily={fontFamily}
          onChangeFontFamily={changeFontFamily}
          lineSpacing={lineSpacing}
          onChangeLineSpacing={changeLineSpacing}
          onResetPreferences={resetPreferences}
        />

        {/* Chapter Content */}
        <div className="py-8">
          {/* Chapter title section */}
          <div className="max-w-4xl mx-auto px-4 md:px-8 mb-8">
            {isEditing ? (
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="w-full text-2xl font-bold px-4 py-2 rounded-lg border bg-theme-background border-theme-border text-theme-foreground focus:border-red-500 focus:outline-none"
                aria-label="Chapter title"
              />
            ) : (
              <h1 className="text-2xl sm:text-3xl font-bold text-theme-foreground">
                Chapter {chapter.chapter_number}: {chapter.title}
                {isLocked && (
                  <span className="ml-3 inline-flex items-center px-2 py-1 text-sm rounded-full bg-theme-background border border-theme-border text-theme-muted">
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      width="14" 
                      height="14" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      className="mr-1"
                    >
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    Premium
                  </span>
                )}
              </h1>
            )}
          </div>

          {/* Reading View Component */}
          <ReadingView 
            content={isEditing ? editedContent : chapter.content || ''}
            isLocked={isLocked}
            isAuthor={isAuthor}
            isEditing={isEditing}
            textSize={textSize}
            effectsEnabled={effectsEnabled}
            onContentChange={setEditedContent}
          />

          {/* Chapter Navigation */}
          <ChapterNavigation 
            novelId={novelId}
            prevChapter={prevChapter}
            nextChapter={nextChapter}
          />
        </div>
      </main>
    </div>
  );
}