"use client";

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Edit, Save, Lock, Unlock, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getChapter, getNovel } from '@/lib/api';
import { ChapterType, NovelType } from '@/types/supabase';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import ReadingView from '@/components/reading/reading-view';

export default function ChapterPage() {
  const { user, role } = useAuth();
  const params = useParams();
  
  const novelId = Number(params.id);
  const chapterNumber = Number(params.chapterId);
  
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
  const [isTextSizeDropdownOpen, setIsTextSizeDropdownOpen] = useState(false);

  // Text size label
  const textSizeLabel = {
    sm: 'Small',
    md: 'Medium',
    lg: 'Large',
    xl: 'Extra Large'
  };

  useEffect(() => {
    // Retrieve text size from localStorage
    const savedTextSize = localStorage.getItem('readingTextSize') as 'sm' | 'md' | 'lg' | 'xl';
    if (savedTextSize) {
      setTextSize(savedTextSize);
    }

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
  
          // Check if the chapter is newly created by comparing timestamps
          const { created_at, updated_at } = chapterData;
          const createdTime = new Date(created_at).getTime();
          const updatedTime = new Date(updated_at).getTime();
  
          // If the difference between created_at and updated_at is less than 10 seconds
          // and the user is the author, show the editing UI
          const isNewChapter = Math.abs(createdTime - updatedTime) < 10000; // 10 seconds in milliseconds
          
          if (isNewChapter && (isAdmin || isNovelAuthor)) {
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

  // Handle text size change
  const changeTextSize = (size: 'sm' | 'md' | 'lg' | 'xl') => {
    setTextSize(size);
    localStorage.setItem('readingTextSize', size);
    setIsTextSizeDropdownOpen(false);
  };

  useEffect(() => {
    const savedTextSize = localStorage.getItem('readingTextSize') as 'sm' | 'md' | 'lg' | 'xl';
    if (savedTextSize) {
      setTextSize(savedTextSize);
    }
  }, []);

  const handleSave = async () => {
    if (!chapter) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('chapters')
        .update({
          title: editedTitle,
          content: editedContent,
          is_locked: isLocked
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

  if (loading) {
    return (
      <div className="min-h-screen bg-theme-background flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-theme-foreground">Loading...</h1>
        </div>
      </div>
    );
  }

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

  const chapterList = novel.chapters.sort((a, b) => a.chapter_number - b.chapter_number);
  const currentIndex = chapterList.findIndex(ch => ch.chapter_number === chapter.chapter_number);
  const prevChapter = currentIndex > 0 ? chapterList[currentIndex - 1] : null;
  const nextChapter = currentIndex < chapterList.length - 1 ? chapterList[currentIndex + 1] : null;

  return (
    <main className="min-h-screen bg-theme-background">
      {/* Fixed Header */}
      <header className="sticky top-0 z-10 bg-theme-background/95 backdrop-blur-sm border-b border-theme-border">
        <div className="max-w-screen-xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <Link 
              href={`/novels/${novelId}`}
              className="flex items-center gap-2 text-theme-foreground hover:opacity-80"
            >
              <ChevronLeft size={20} />
              <span className="line-clamp-1">{novel?.title}</span>
            </Link>

            <div className="flex items-center gap-2">
              {/* Text Size Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsTextSizeDropdownOpen(!isTextSizeDropdownOpen)}
                  className="flex items-center gap-1 text-sm text-theme-foreground px-2 py-1 rounded hover:bg-theme-hover"
                >
                  <span className="hidden sm:inline">Text Size:</span> {textSizeLabel[textSize]} <ChevronDown size={16} />
                </button>
                {isTextSizeDropdownOpen && (
                  <div className="absolute right-0 mt-1 w-36 bg-theme-background border border-theme-border rounded-lg shadow-lg">
                    {(['sm', 'md', 'lg', 'xl'] as const).map((size) => (
                      <button
                        key={size}
                        onClick={() => changeTextSize(size)}
                        className={`
                          w-full 
                          text-left 
                          px-3 
                          py-2 
                          text-sm
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

              {isAuthor && (
                <>
                  <button
                    onClick={() => setIsLocked(!isLocked)}
                    className="p-2 rounded hover:bg-theme-hover text-theme-foreground"
                    title={isLocked ? 'Unlock Chapter' : 'Lock Chapter'}
                  >
                    {isLocked ? <Lock size={20} /> : <Unlock size={20} />}
                  </button>
                  
                  {isEditing ? (
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                    >
                      <Save size={18} />
                      <span className="hidden sm:inline">{saving ? 'Saving...' : 'Save'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded hover:bg-theme-hover text-theme-foreground"
                    >
                      <Edit size={18} />
                      <span className="hidden sm:inline">Edit</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="py-8">
        {/* Chapter Title */}
        <div className="max-w-prose mx-auto px-4 mb-8">
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

        {/* Reading View */}
        <ReadingView
    content={isEditing ? editedContent : chapter.content || ''}
    isLocked={isLocked}
    isAuthor={isAuthor}
    isEditing={isEditing}
    textSize={textSize}  // Changed from initialTextSize to textSize
    onContentChange={setEditedContent}
  />

        {/* Chapter Navigation */}
        <div className="max-w-prose mx-auto px-4 mt-12 flex justify-between items-center">
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