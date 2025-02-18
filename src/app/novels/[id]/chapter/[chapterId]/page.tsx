// src/app/novels/[id]/chapter/[chapterId]/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useTheme } from '@/providers/theme-provider';
import { ChevronLeft, ChevronRight, Edit, Save, Lock, Unlock } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getChapter, getNovel } from '@/lib/api';
import { ChapterType, NovelType } from '@/types/supabase';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import ReadingView from '@/components/reading/reading-view';

export default function ChapterPage() {
  const { theme } = useTheme();
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
        }
      } catch (error) {
        console.error('Error loading chapter:', error);
      } finally {
        setLoading(false);
      }
    }
    loadChapter();
  }, [novelId, chapterNumber, user, role]);

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
      <div className="min-h-screen bg-theme-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-theme-foreground">Loading...</h1>
        </div>
      </div>
    );
  }

  if (!chapter || !novel) {
    return (
      <div className="min-h-screen bg-theme-background flex items-center justify-center">
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
    <main className={`min-h-screen bg-theme-background ${theme === 'reading' ? 'reading' : ''}`}>
      {/* Navigation Header */}
      <header className="sticky top-0 z-10 bg-theme-background border-b border-theme-border shadow">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link 
              href={`/novels/${novelId}`}
              className="flex items-center gap-2 text-theme-foreground hover:opacity-80"
            >
              <ChevronLeft size={20} />
              <span>{novel.title}</span>
            </Link>

            {isAuthor && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsLocked(!isLocked)}
                  className="p-2 rounded-lg hover:bg-theme-hover text-theme-foreground"
                  title={isLocked ? 'Unlock Chapter' : 'Lock Chapter'}
                >
                  {isLocked ? <Lock size={20} /> : <Unlock size={20} />}
                </button>
                {isEditing ? (
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    <Save size={18} />
                    <span>{saving ? 'Saving...' : 'Save'}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-theme-background border border-theme-border text-theme-foreground rounded-lg hover:bg-theme-hover"
                  >
                    <Edit size={18} />
                    <span>Edit</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Chapter Title */}
          {isEditing ? (
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              className="w-full text-3xl font-bold mb-8 px-4 py-2 rounded-lg border 
                bg-theme-background 
                border-theme-border 
                text-theme-foreground 
                focus:border-red-500 
                focus:outline-none"
            />
          ) : (
            <h1 className="text-3xl font-bold mb-8 text-theme-foreground">
              Chapter {chapter.chapter_number}: {chapter.title}
              {isLocked && (
                <span className="ml-3 inline-flex items-center px-2 py-1 text-sm rounded-full bg-theme-background border border-theme-border text-theme-muted">
                  <Lock size={14} className="mr-1" />
                  Premium
                </span>
              )}
            </h1>
          )}

          {/* Reading View */}
          <ReadingView
            content={isEditing ? editedContent : chapter.content || ''}
            isLocked={isLocked}
            isAuthor={isAuthor}
            isEditing={isEditing}
            onContentChange={setEditedContent}
          />

          {/* Chapter Navigation */}
          <div className="flex justify-between items-center mt-8">
            {prevChapter ? (
              <Link 
                href={`/novels/${novelId}/chapter/${prevChapter.chapter_number}`}
                className="flex items-center gap-2 px-4 py-2 rounded-lg 
                  bg-theme-background 
                  border border-theme-border 
                  text-theme-foreground 
                  hover:bg-theme-hover 
                  shadow"
              >
                <ChevronLeft size={20} />
                <span>Previous Chapter</span>
              </Link>
            ) : <div />}

            {nextChapter && (
              <Link 
                href={`/novels/${novelId}/chapter/${nextChapter.chapter_number}`}
                className="flex items-center gap-2 px-4 py-2 rounded-lg 
                  bg-theme-background 
                  border border-theme-border 
                  text-theme-foreground 
                  hover:bg-theme-hover 
                  shadow"
              >
                <span>Next Chapter</span>
                <ChevronRight size={20} />
              </Link>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}