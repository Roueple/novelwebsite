
"use client";

import { useState, useEffect } from 'react';
import { useTheme } from '@/providers/theme-provider';
import { Moon, Sun, Type, ChevronLeft, ChevronRight, Minus, Plus, ArrowLeft, List } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getChapter, getNovel } from '@/lib/api';
import { ChapterType } from '@/types/supabase';

const MIN_FONT_SIZE = 14;
const MAX_FONT_SIZE = 24;

export default function ChapterPage() {
  const { theme, toggleTheme } = useTheme();
  const [fontSize, setFontSize] = useState(16);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChapterListOpen, setIsChapterListOpen] = useState(false);
  const isDark = theme === 'dark';
  
  const params = useParams();
  const novelId = Number(params.id);
  const chapterNumber = Number(params.chapterId);
  
  const [loading, setLoading] = useState(true);
  const [chapter, setChapter] = useState<ChapterType | null>(null);
  const [novel, setNovel] = useState<any>(null);
  

  useEffect(() => {
    async function loadChapter() {
      try {
        // Load chapter data
        const chapterData = await getChapter(novelId, chapterNumber);
        setChapter(chapterData);
        
        // Load novel data for chapter list
        const novelData = await getNovel(novelId);
        setNovel(novelData);
      } catch (error) {
        console.error('Error loading chapter:', error);
      } finally {
        setLoading(false);
      }
    }
    loadChapter();
  }, [novelId, chapterNumber]);

  // Load saved font size
  useEffect(() => {
    const savedFontSize = localStorage.getItem('fontSize');
    if (savedFontSize) {
      setFontSize(Number(savedFontSize));
    }
  }, []);

  const updateFontSize = (newSize: number) => {
    const size = Math.min(Math.max(newSize, MIN_FONT_SIZE), MAX_FONT_SIZE);
    setFontSize(size);
    localStorage.setItem('fontSize', String(size));
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} 
        flex items-center justify-center`}>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading...</h1>
        </div>
      </div>
    );
  }

  if (!chapter || !novel) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} 
        flex items-center justify-center`}>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Chapter not found</h1>
          <Link 
            href="/"
            className={`px-4 py-2 rounded-lg ${
              isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-100'
            } shadow`}
          >
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  const prevChapter = novel.chapters.find((ch: ChapterType) => ch.chapter_number === chapterNumber - 1);
  const nextChapter = novel.chapters.find((ch: ChapterType) => ch.chapter_number === chapterNumber + 1);

  if (chapter.is_locked) {
    return (
      <main className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <header className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow`}>
          <div className="container mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <Link 
                href={`/novels/${novelId}`}
                className={`flex items-center gap-2 ${
                  isDark ? 'text-gray-200 hover:text-white' : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                <ArrowLeft size={20} />
                <span>{novel.title}</span>
              </Link>
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg border ${
                  isDark 
                    ? 'border-gray-600 hover:bg-gray-700 text-yellow-400' 
                    : 'border-gray-300 hover:bg-gray-50 text-gray-600'
                }`}
              >
                {isDark ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center">
            <svg 
              className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
              />
            </svg>
            <h1 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Chapter {chapter.chapter_number}: {chapter.title}
            </h1>
            <p className={`mb-8 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              This chapter is locked. Please subscribe to continue reading.
            </p>
            <button
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              onClick={() => alert('Subscription feature coming soon!')}
            >
              Subscribe to Unlock
            </button>
            <div className="mt-8 flex justify-center gap-4">
              {prevChapter && (
                <Link 
                  href={`/novels/${novelId}/chapter/${prevChapter.chapter_number}`}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                    isDark 
                      ? 'bg-gray-800 hover:bg-gray-700 text-gray-200' 
                      : 'bg-white hover:bg-gray-50 text-gray-700'
                  } shadow`}
                >
                  <ChevronLeft size={20} />
                  <span>Previous Chapter</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={`min-h-screen transition-colors duration-200 ${
      isDark ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      <header className={`sticky top-0 z-10 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow`}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link 
              href={`/novels/${novelId}`}
              className={`flex items-center gap-2 ${
                isDark ? 'text-gray-200 hover:text-white' : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              <ArrowLeft size={20} />
              <span>{novel.title}</span>
            </Link>

            <div className="flex gap-2">
              {/* Chapter List */}
              <div className="relative">
                <button
                  onClick={() => setIsChapterListOpen(!isChapterListOpen)}
                  className={`p-2 rounded-lg border ${
                    isDark 
                      ? 'border-gray-600 hover:bg-gray-700' 
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <List size={20} className={isDark ? 'text-gray-300' : 'text-gray-600'} />
                </button>

                {isChapterListOpen && (
                  <div className={`absolute left-0 mt-2 w-64 rounded-lg shadow-lg z-50 ${
                    isDark ? 'bg-gray-800' : 'bg-white'
                  }`}>
                    <div className="max-h-96 overflow-y-auto p-2">
                      <div className={`text-sm font-medium mb-2 px-4 py-2 ${
                        isDark ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        Chapters
                      </div>
                      {novel.chapters.map((ch: ChapterType) => (
                        <Link
                          key={ch.id}
                          href={`/novels/${novelId}/chapter/${ch.chapter_number}`}
                          className={`block w-full text-left px-4 py-2 rounded ${
                            ch.chapter_number === chapter.chapter_number
                              ? isDark 
                                ? 'bg-gray-700' 
                                : 'bg-gray-100'
                              : ''
                          } hover:bg-gray-100 hover:dark:bg-gray-700`}
                        >
                          <div className={isDark ? 'text-gray-200' : 'text-gray-900'}>
                            Chapter {ch.chapter_number}
                          </div>
                          <div className={`text-sm ${
                            isDark ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            {ch.title}
                            {ch.is_locked && ' (Locked)'}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Font Settings */}
              <div className="relative">
                <button
                  onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                  className={`p-2 rounded-lg border ${
                    isDark 
                      ? 'border-gray-600 hover:bg-gray-700' 
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <Type size={20} className={isDark ? 'text-gray-300' : 'text-gray-600'} />
                </button>

                {isSettingsOpen && (
                  <div className={`absolute right-0 mt-2 w-64 rounded-lg shadow-lg p-4 z-50 ${
                    isDark ? 'bg-gray-800 text-gray-200' : 'bg-white text-gray-900'
                  }`}>
                    <div className="mb-4">
                      <div className="text-sm font-medium mb-2">Font Size</div>
                      <div className="flex items-center justify-between gap-2">
                        <button 
                          onClick={() => updateFontSize(fontSize - 1)}
                          className={`p-1 rounded hover:bg-gray-100 hover:dark:bg-gray-700 ${
                            fontSize <= MIN_FONT_SIZE ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          disabled={fontSize <= MIN_FONT_SIZE}
                        >
                          <Minus size={16} />
                        </button>
                        <span className="w-8 text-center">{fontSize}</span>
                        <button 
                          onClick={() => updateFontSize(fontSize + 1)}
                          className={`p-1 rounded hover:bg-gray-100 hover:dark:bg-gray-700 ${
                            fontSize >= MAX_FONT_SIZE ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          disabled={fontSize >= MAX_FONT_SIZE}
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg border ${
                  isDark 
                    ? 'border-gray-600 hover:bg-gray-700 text-yellow-400' 
                    : 'border-gray-300 hover:bg-gray-50 text-gray-600'
                }`}
              >
                {isDark ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <h1 className={`text-3xl font-bold mb-8 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Chapter {chapter.chapter_number}: {chapter.title}
          </h1>

          <div 
            className={`space-y-4 leading-relaxed mb-12 ${
              isDark ? 'text-gray-300' : 'text-gray-600'
            }`}
            style={{ fontSize: `${fontSize}px` }}
          >
            {chapter.content?.split('\n\n').map((paragraph: string, index: number) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>

          <div className="flex justify-between items-center">
            {prevChapter && (
              <Link 
                href={`/novels/${novelId}/chapter/${prevChapter.chapter_number}`}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                  isDark 
                    ? 'bg-gray-800 hover:bg-gray-700 text-gray-200' 
                    : 'bg-white hover:bg-gray-50 text-gray-700'
                } shadow`}
              >
                <ChevronLeft size={20} />
                <span>Previous Chapter</span>
              </Link>
            )}

            {nextChapter && (
              <Link 
                href={`/novels/${novelId}/chapter/${nextChapter.chapter_number}`}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                  isDark 
                    ? 'bg-gray-800 hover:bg-gray-700 text-gray-200' 
                    : 'bg-white hover:bg-gray-50 text-gray-700'
                } shadow`}
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