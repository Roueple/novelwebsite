// src/app/novels/[id]/chapter/[chapterId]/page.tsx
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { getChapter, getNovel } from '@/lib/api';
import ReadingHeader from '@/components/reading/reading-header';
import ReadingView from '@/components/reading/reading-view';
import ChapterNavigation from '@/components/reading/chapter-navigation';
import ReadingSettingsMenu from '@/components/reading/reading-settings-menu';
import LoadingScreen from '@/components/ui/loading-screen';
import NotFoundScreen from '@/components/ui/not-found-screen';
import { useReadingPreferences } from '@/hooks/use-reading-preferences';
import { useChapterActions } from '@/hooks/use-chapter-actions';
import type { ChapterType, NovelType } from '@/types/supabase';
import { toast } from 'sonner';
import { Lock } from 'lucide-react'; // <-- ADD THIS IMPORT

export default function ChapterPage() {
  const { user, role } = useAuth();
  const { theme } = useTheme();
  const params = useParams();
  const router = useRouter();
  const novelId = Number(params.id);
  const chapterNumber = Number(params.chapterId);

  // State management
  const [loading, setLoading] = useState(true);
  const [initialLoadError, setInitialLoadError] = useState<string | null>(null);
  const [chapter, setChapter] = useState<ChapterType | null>(null);
  const [novel, setNovel] = useState<NovelType | null>(null);
  const [headerVisible, setHeaderVisible] = useState(true);

  // Custom hooks for preferences and actions
  const {
    textSize,
    effectsEnabled, // Keep track of effectsEnabled from preferences
    toggleEffects,  // Keep the toggle function
    animationsEnabled,
    fontFamily,
    lineSpacing,
    showSettingsMenu,
    settingsMenuRef,
    setShowSettingsMenu,
    changeTextSize,
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
    editedTitle,
    setEditedTitle,
    editedContent,
    setEditedContent,
    saving,
    handleSave,
    handleLockToggle,
    handleCancelEdit
  } = useChapterActions(chapter, user, role, setChapter, novel);

  // --- (useEffect for loading data remains the same) ---
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setInitialLoadError(null); // Reset error on new load attempt
      try {
        const [chapterData, novelData] = await Promise.all([
          getChapter(novelId, chapterNumber),
          getNovel(novelId)
        ]);

        if (!novelData) {
          throw new Error('Novel not found');
        }
        if (!chapterData) {
          throw new Error('Chapter not found');
        }

        setChapter(chapterData);
        setNovel(novelData);
        // Initialization is now handled within useChapterActions hook's useEffect

      } catch (error: any) {
        console.error('Error loading chapter data:', error);
        setInitialLoadError(error.message || 'Failed to load chapter data.');
        // Optionally show a toast for loading errors
        toast.error(`Error: ${error.message || 'Failed to load chapter data.'}`);
      } finally {
        setLoading(false);
      }
    }
    // Validate IDs before fetching
    if (isNaN(novelId) || isNaN(chapterNumber)) {
       setInitialLoadError('Invalid novel or chapter ID.');
       setLoading(false);
       toast.error('Invalid URL parameters.');
       // Consider redirecting: router.push('/');
    } else {
       loadData();
    }
  }, [novelId, chapterNumber]);

  // --- (useEffect for applying reading preferences remains the same) ---
    useEffect(() => {
    if (!animationsEnabled) {
      document.documentElement.classList.add('disable-animations');
    } else {
      document.documentElement.classList.remove('disable-animations');
    }
    document.documentElement.style.setProperty('--reading-line-height', lineSpacing.toString());
    if (fontFamily) {
      document.documentElement.style.setProperty('--reading-font-family', fontFamily);
    }
    return () => {
      document.documentElement.classList.remove('disable-animations');
      document.documentElement.style.removeProperty('--reading-line-height');
      document.documentElement.style.removeProperty('--reading-font-family');
    };
  }, [animationsEnabled, lineSpacing, fontFamily]);


  // --- (useMemo for pageClasses remains the same) ---
    const pageClasses = useMemo(() => {
    const classes = ['reading-page'];
    if (!animationsEnabled) {
      classes.push('disable-animations');
    }
    return classes.join(' ');
  }, [animationsEnabled]);


  // --- (useEffect for keyboard shortcuts remains the same) ---
    useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showSettingsMenu) {
        setShowSettingsMenu(false); return;
      }
      if (e.key === 's' && !isEditing && !e.ctrlKey && !e.metaKey) {
         // Allow 's' for settings only when not editing
        setShowSettingsMenu(prev => !prev); return;
      }
       // Allow default browser save (Ctrl+S) or other keys when editing
      if (!isEditing && (e.ctrlKey || e.metaKey)) {
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
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSettingsMenu, isEditing, textSize, setShowSettingsMenu, changeTextSize]);


  // --- (useMemo for chapter navigation remains the same) ---
  const { prevChapter, nextChapter } = useMemo(() => {
    if (!novel?.chapters) return { prevChapter: null, nextChapter: null };
    const chapterList = [...novel.chapters].sort((a, b) => a.chapter_number - b.chapter_number);
    const currentIndex = chapterList.findIndex(ch => ch.chapter_number === chapterNumber);
    return {
      prevChapter: currentIndex > 0 ? chapterList[currentIndex - 1] : null,
      nextChapter: currentIndex < chapterList.length - 1 ? chapterList[currentIndex + 1] : null
    };
  }, [novel?.chapters, chapterNumber]);

  // --- (Loading and Error handling remains the same) ---
  if (loading) {
    return <LoadingScreen message="Loading chapter..." />;
  }
  if (initialLoadError) {
    return <NotFoundScreen message={initialLoadError} returnUrl={`/novels/${novelId || ''}`} returnText="Back to Novel" />;
  }
  if (!chapter || !novel) {
     console.warn("Chapter or Novel data is null after loading completed without error.");
    return <NotFoundScreen message="Chapter or Novel data could not be loaded." returnUrl={`/novels/${novelId || ''}`} returnText="Back to Novel"/>;
  }


  // --- (Edit/Cancel handlers remain the same) ---
  const startEditing = () => {
      if (!chapter) return;
      setEditedTitle(chapter.title);
      setEditedContent(chapter.content || '');
      setIsEditing(true);
  };
  const cancelEditing = () => {
      handleCancelEdit();
  };

  return (
    <div className={pageClasses}>
      <main
        className="min-h-screen bg-theme-background"
        style={{
          fontFamily: `var(--reading-font-family, ${fontFamily})`,
          lineHeight: `${lineSpacing}`
        }}
      >
        {/* ReadingHeader Component */}
        <ReadingHeader
          novel={novel}
          chapter={chapter}
          isAuthor={isAuthor}
          isEditing={isEditing}
          isLocked={isLocked}
          visible={headerVisible}
          setVisible={setHeaderVisible}
          textSize={textSize}
          effectsEnabled={effectsEnabled} // Pass effectsEnabled
          showSettingsMenu={showSettingsMenu}
          setShowSettingsMenu={setShowSettingsMenu}
          onEdit={startEditing}
          onSave={handleSave}
          onLockToggle={handleLockToggle}
          onCancelEdit={cancelEditing} // Pass the cancel handler
          saving={saving} // Pass saving state
        />

        {/* Settings Menu Component */}
        <ReadingSettingsMenu
          isOpen={showSettingsMenu}
          onClose={() => setShowSettingsMenu(false)}
          menuRef={settingsMenuRef}
          textSize={textSize}
          onChangeTextSize={changeTextSize}
          effectsEnabled={effectsEnabled} // Pass effectsEnabled
          onToggleEffects={toggleEffects} // Pass toggleEffects
          animationsEnabled={animationsEnabled}
          onToggleAnimations={toggleAnimations}
          fontFamily={fontFamily}
          onChangeFontFamily={changeFontFamily}
          lineSpacing={lineSpacing}
          onChangeLineSpacing={changeLineSpacing}
          onResetPreferences={resetPreferences}
        />

        {/* Chapter Content Area */}
        <div className="py-8">
          {/* Chapter Title (Editable or Static) */}
          <div className="max-w-4xl mx-auto px-4 md:px-8 mb-8">
            {isEditing ? (
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="w-full text-2xl sm:text-3xl font-bold px-4 py-2 rounded-lg border bg-theme-background border-theme-border text-theme-foreground focus:border-red-500 focus:outline-none"
                aria-label="Chapter title"
                disabled={saving}
              />
            ) : (
              <h1 className="text-2xl sm:text-3xl font-bold text-theme-foreground">
                Chapter {chapter.chapter_number}: {chapter.title}
                {isLocked && (
                  <span className="ml-3 inline-flex items-center px-2 py-1 text-sm rounded-full bg-theme-background border border-theme-border text-theme-muted">
                    {/* Use the imported Lock component */}
                    <Lock size={14} className="mr-1"/>
                    Premium
                  </span>
                )}
              </h1>
            )}
          </div>

          {/* Reading View */}
          <ReadingView
            content={editedContent}
            isLocked={isLocked}
            isAuthor={isAuthor}
            isEditing={isEditing}
            textSize={textSize}
            effectsEnabled={effectsEnabled} // Pass effectsEnabled
            saving={saving}
            onContentChange={setEditedContent}
          />

          {/* Chapter Navigation */}
          {!isEditing && (
             <ChapterNavigation
              novelId={novelId}
              prevChapter={prevChapter}
              nextChapter={nextChapter}
            />
          )}
        </div>
      </main>
    </div>
  );
}