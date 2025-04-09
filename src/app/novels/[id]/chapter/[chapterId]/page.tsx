"use client";

import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Edit, Save, Lock, Unlock, ChevronDown, X, Sun, Moon, BookOpen, Settings, Type } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getChapter, getNovel } from '@/lib/api';
import { ChapterType, NovelType } from '@/types/supabase';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

// Component to render text with dynamic typography effects
const DynamicText = ({ content, isEnabled }: { content: string; isEnabled: boolean }) => {
  if (!isEnabled || !content) {
    // Return regular text without processing if effects are disabled
    return <div className="whitespace-pre-wrap">{content}</div>;
  }

  // Process text for dynamic typography effects
  // This is a simple implementation that looks for markers like [shout], [whisper], etc.
  // A more sophisticated version would use proper HTML parsing

  // Map of effect markers and their corresponding classes
  const effectMarkers = {
    '[shout]': 'effect-shout',
    '[whisper]': 'effect-whisper',
    '[tremble]': 'effect-tremble',
    '[hesitate]': 'effect-hesitation',
    '[emphasis]': 'effect-emphasis',
    '[fade]': 'effect-fade',
  };

  // Split by paragraphs to maintain proper paragraph structure
  const paragraphs = content.split(/\n+/);

  // Process each paragraph for effects
  const processedParagraphs = paragraphs.map((paragraph, index) => {
    let processedText = paragraph;
    
    // Replace each marker with a styled span
    Object.entries(effectMarkers).forEach(([marker, className]) => {
      // Create a regex that matches the marker followed by any text until the closing marker
      const regex = new RegExp(`${marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(.*?)${marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');
      
      // Replace all instances of this marker with a span of the appropriate class
      processedText = processedText.replace(regex, `<span class="${className}">$1</span>`);
    });

    // Check if paragraph is dialogue (starts with a quotation mark)
    if (processedText.trim().startsWith('"')) {
      processedText = `<span class="dialogue">${processedText}</span>`;
    }

    // Return the processed paragraph
    return (
      <p key={index} className="mb-6 leading-relaxed" 
         dangerouslySetInnerHTML={{ __html: processedText }} />
    );
  });

  return <>{processedParagraphs}</>;
};

// Main Chapter Page Component
export default function ChapterPage() {
  const { user, role } = useAuth();
  const { theme, cycleTheme } = useTheme();
  const params = useParams();
  
  const novelId = Number(params.id);
  const chapterNumber = Number(params.chapterId);
  
  // State management
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAuthor, setIsAuthor] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [chapter, setChapter] = useState<ChapterType | null>(null);
  const [novel, setNovel] = useState<NovelType | null>(null);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [textSize, setTextSize] = useState<'sm' | 'md' | 'lg' | 'xl'>('md');
  const [headerVisible, setHeaderVisible] = useState(true);
  
  // New state for dynamic text effects
  const [effectsEnabled, setEffectsEnabled] = useState(true);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  
  // Refs
  const contentRef = useRef<HTMLDivElement>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);

  // Text size label
  const textSizeLabel = {
    sm: 'Small',
    md: 'Medium',
    lg: 'Large',
    xl: 'Extra Large'
  };

  // Get size classes based on text size setting
  const sizeClasses = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl',
    xl: 'text-2xl'
  };
  
  // Theme icon mapping
  const themeIcons = {
    light: <Sun size={20} />,
    dark: <Moon size={20} />,
    reading: <BookOpen size={20} />
  };

  // Load chapter data on mount
  useEffect(() => {
    async function loadChapter() {
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
          setIsAuthor(isAdmin || isNovelAuthor);
  
          // Show editing UI only if first view is not completed and user is author/admin
          if (chapterData.newly_created && (isAdmin || isNovelAuthor)) {
            setIsEditing(true);
          } else {
            setIsEditing(false);
          }
        }
      } catch (error) {
        console.error('Error loading chapter:', error);
      } finally {
        setLoading(false);
      }
    }
    loadChapter();
  }, [novelId, chapterNumber, user, role]);

  // Load saved text size preference
  useEffect(() => {
    const savedTextSize = localStorage.getItem('readingTextSize') as 'sm' | 'md' | 'lg' | 'xl';
    if (savedTextSize) {
      setTextSize(savedTextSize);
    }

    // Also load effects preference
    const effectsPref = localStorage.getItem('textEffectsEnabled');
    if (effectsPref !== null) {
      setEffectsEnabled(effectsPref === 'true');
    }
  }, []);

  // Close settings menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
        setShowSettingsMenu(false);
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
  };

  // Toggle text effects
  const toggleEffects = () => {
    const newValue = !effectsEnabled;
    setEffectsEnabled(newValue);
    localStorage.setItem('textEffectsEnabled', String(newValue));
  };

  // Toggle chapter lock state
  const handleLockToggle = async () => {
    if (!chapter) return;
    
    try {
      const newLockedState = !isLocked;
      const { error } = await supabase
        .from('chapters')
        .update({
          is_locked: newLockedState
        })
        .eq('id', chapter.id);
  
      if (error) throw error;
  
      // Update local state
      setIsLocked(newLockedState);
      setChapter(prev => prev ? {
        ...prev,
        is_locked: newLockedState
      } : null);
    } catch (error) {
      console.error('Error toggling chapter lock:', error);
      alert('Failed to update chapter lock status. Please try again.');
    }
  };

  // Save chapter
  const handleSave = async () => {
    if (!chapter) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('chapters')
        .update({
          title: editedTitle,
          content: editedContent,
          is_locked: isLocked,
          newly_created: false  // Mark as viewed when saving
        })
        .eq('id', chapter.id);

      if (error) throw error;

      setChapter(prev => prev ? {
        ...prev,
        title: editedTitle,
        content: editedContent,
        is_locked: isLocked
      } : null);

      setIsEditing(false);
    } catch (error) {
      console.error('Error saving chapter:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-theme-background flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-theme-foreground">Loading...</h1>
        </div>
      </div>
    );
  }

  // Render 404 state
  if (!chapter || !novel) {
    return (
      <div className="min-h-screen bg-theme-background flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-theme-foreground">Chapter not found</h1>
          <Link 
            href={`/novels/${novelId}`}
            className="px-4 py-2 rounded-lg bg-theme-background border border-theme-border text-theme-foreground hover:bg-theme-hover shadow"
          >
            Return to Novel
          </Link>
        </div>
      </div>
    );
  }

  // Get chapter navigation data
  const chapterList = novel.chapters.sort((a, b) => a.chapter_number - b.chapter_number);
  const currentIndex = chapterList.findIndex(ch => ch.chapter_number === chapter.chapter_number);
  const prevChapter = currentIndex > 0 ? chapterList[currentIndex - 1] : null;
  const nextChapter = currentIndex < chapterList.length - 1 ? chapterList[currentIndex + 1] : null;

  return (
    <main className="min-h-screen bg-theme-background">
      {/* Unified Header for Chapter Pages */}
      {headerVisible ? (
        <header className="sticky top-0 z-10 bg-theme-background/95 backdrop-blur-sm border-b border-theme-border">
          <div className="max-w-screen-xl mx-auto px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Left side */}
              <div className="flex items-center gap-4">
                <Link 
                  href={`/novels/${novelId}`}
                  className="flex items-center gap-1 text-theme-foreground hover:opacity-80"
                >
                  <ChevronLeft size={18} />
                  <span className="text-sm">Back</span>
                </Link>
                
                <h2 className="text-sm font-medium text-theme-foreground line-clamp-1">
                  {novel?.title}
                </h2>
              </div>
              
              {/* Right side */}
              <div className="flex items-center gap-2">
                {/* Settings Button */}
                <div className="relative">
                  <button
                    onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                    className="p-1.5 rounded hover:bg-theme-hover"
                    aria-label="Reading settings"
                  >
                    <Settings size={16} />
                  </button>
                  
                  {/* Settings Menu */}
                  {showSettingsMenu && (
                    <div 
                      ref={settingsMenuRef}
                      className="absolute right-0 mt-1 w-48 py-2 bg-theme-card border border-theme-border rounded-lg shadow-lg z-50"
                    >
                      <div className="px-3 py-2 border-b border-theme-border">
                        <p className="font-medium text-sm text-theme-foreground">Reading Settings</p>
                      </div>
                      
                      {/* Text Size Controls */}
                      <div className="px-3 py-2">
                        <p className="text-xs text-theme-muted mb-1">Text Size</p>
                        <div className="flex flex-col gap-1">
                          {(['sm', 'md', 'lg', 'xl'] as const).map((size) => (
                            <button
                              key={size}
                              onClick={() => changeTextSize(size)}
                              className={`
                                w-full text-left px-2 py-1 text-xs rounded
                                ${textSize === size 
                                  ? 'bg-theme-hover font-medium' 
                                  : 'hover:bg-theme-hover/50'
                                }
                              `}
                            >
                              {textSizeLabel[size]}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      {/* Text Effects Toggle */}
                      <div className="px-3 py-2 border-t border-theme-border">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-theme-foreground">Dynamic Text Effects</span>
                          <button 
                            onClick={toggleEffects}
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
                      
                      {/* Theme Controls */}
                      <div className="px-3 py-2 border-t border-theme-border">
                        <p className="text-xs text-theme-muted mb-1">Theme</p>
                        <button 
                          onClick={cycleTheme}
                          className="flex items-center gap-2 w-full text-left px-2 py-1 text-xs rounded hover:bg-theme-hover/50"
                        >
                          <span className="w-4 h-4 flex items-center justify-center">
                            {themeIcons[theme]}
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
                    </div>
                  )}
                </div>
                
                {/* Edit Button (if author) */}
                {isAuthor && !isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-1.5 rounded hover:bg-theme-hover"
                    aria-label="Edit chapter"
                  >
                    <Edit size={16} />
                  </button>
                )}
                
                {/* Save Button (if editing) */}
                {isEditing && (
                  <button
                    onClick={handleSave}
                    className="p-1.5 rounded hover:bg-theme-hover"
                    aria-label="Save changes"
                  >
                    <Save size={16} />
                  </button>
                )}
                
                {/* Lock Toggle (if author) */}
                {isAuthor && (
                  <button
                    onClick={handleLockToggle}
                    className="p-1.5 rounded hover:bg-theme-hover"
                    aria-label={isLocked ? 'Unlock chapter' : 'Lock chapter'}
                  >
                    {isLocked ? <Lock size={16} /> : <Unlock size={16} />}
                  </button>
                )}
                
                {/* Close/Hide Button */}
                <button
                  onClick={() => setHeaderVisible(false)}
                  className="p-1.5 rounded hover:bg-theme-hover"
                  aria-label="Hide header"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>
        </header>
      ) : (
        <button
          onClick={() => setHeaderVisible(true)}
          className="fixed top-4 right-4 z-50 p-2 bg-theme-card/80 backdrop-blur-sm border border-theme-border rounded-full shadow-lg hover:bg-theme-hover"
          aria-label="Show header"
        >
          <ChevronDown size={20} className="text-theme-foreground" />
        </button>
      )}

      {/* Main Content */}
      <div className="py-8">
        {/* Chapter Title */}
        <div className="max-w-4xl mx-auto px-4 md:px-8 mb-8">
          {isEditing ? (
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              className="w-full text-2xl font-bold px-4 py-2 rounded-lg border bg-theme-background border-theme-border text-theme-foreground focus:border-red-500 focus:outline-none"
            />
          ) : (
            <h1 className="text-2xl sm:text-3xl font-bold text-theme-foreground">
              Chapter {chapter.chapter_number}: {chapter.title}
              {isLocked && (
                <span className="ml-3 inline-flex items-center px-2 py-1 text-sm rounded-full bg-theme-background border border-theme-border text-theme-muted">
                  <Lock size={14} className="mr-1" />
                  Premium
                </span>
              )}
            </h1>
          )}
        </div>

        {/* Content Section */}
        {isLocked && !isAuthor ? (
          <div className="max-w-4xl mx-auto px-4 md:px-8 text-center py-16">
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
            <h2 className="text-2xl font-bold mb-2 text-theme-foreground">
              Premium Chapter
            </h2>
            <p className="mb-8 text-theme-muted">
              This chapter is locked. Please subscribe to continue reading.
            </p>
            <button
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              onClick={() => alert('Subscription feature coming soon!')}
            >
              Subscribe to Unlock
            </button>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto px-4 md:px-8">
            {isEditing ? (
              <div className="border-2 border-dashed border-red-500 p-4 rounded-lg">
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className={`
                    w-full min-h-[300px] p-4
                    outline-none focus:ring-0
                    bg-theme-background text-theme-foreground
                    ${sizeClasses[textSize]}
                    whitespace-pre-wrap
                  `}
                  placeholder="Write your chapter content here..."
                />
              </div>
            ) : (
              <div 
                ref={contentRef} 
                className={`
                  prose max-w-none
                  ${sizeClasses[textSize]}
                `}
              >
                <DynamicText 
                  content={chapter.content || ''} 
                  isEnabled={effectsEnabled}
                />
              </div>
            )}
          </div>
        )}

        {/* Chapter Navigation */}
        <div className="max-w-4xl mx-auto px-4 md:px-8 mt-12 flex justify-between items-center">
          {prevChapter ? (
            <Link 
              href={`/novels/${novelId}/chapter/${prevChapter.chapter_number}`}
              className="flex items-center gap-2 px-4 py-2 rounded hover:bg-theme-hover text-theme-foreground"
            >
              <ChevronLeft size={20} />
              <span className="hidden sm:inline">Previous Chapter</span>
              <span className="inline sm:hidden">Prev</span>
            </Link>
          ) : <div />}

          {nextChapter && (
            <Link 
              href={`/novels/${novelId}/chapter/${nextChapter.chapter_number}`}
              className="flex items-center gap-2 px-4 py-2 rounded hover:bg-theme-hover text-theme-foreground"
            >
              <span className="hidden sm:inline">Next Chapter</span>
              <span className="inline sm:hidden">Next</span>
              <ChevronRight size={20} />
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}