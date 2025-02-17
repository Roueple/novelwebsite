"use client";

import { useState, useEffect } from 'react';
import { useTheme } from '@/providers/theme-provider';
import { BookOpen, Edit, Trash2, Check, X, Plus } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ImageUpload } from '@/components/ui/image-upload';
import { supabase } from '@/lib/supabase';
import { getNovel } from '@/lib/api';
import type { NovelType } from '@/types/supabase';
import Image from 'next/image';
import { useAuth } from '@/providers/auth-provider';
import AddChapterModal from '@/components/add-chapter-modal';

export default function NovelPage() {
  const { theme } = useTheme();
  const { user, role } = useAuth();
  const isDark = theme === 'dark';
  const params = useParams();
  const novelId = Number(params.id);
  
  const [novel, setNovel] = useState<NovelType | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthor, setIsAuthor] = useState(false);
  const [isEditingNovel, setIsEditingNovel] = useState(false);
  const [isEditingChapter, setIsEditingChapter] = useState<number | null>(null);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedChapterTitle, setEditedChapterTitle] = useState('');
  const [showAddChapter, setShowAddChapter] = useState(false);

  useEffect(() => {
    async function loadNovel() {
      const data = await getNovel(novelId);
      setNovel(data);
      setLoading(false);
    }
    loadNovel();
  }, [novelId]);

  useEffect(() => {
    if (novel && user) {
      const isAdmin = role === 'admin';
      const isNovelAuthor = novel.author_id === user.id;
      setIsAuthor(isAdmin || isNovelAuthor);
    }
  }, [novel, user, role]);

  const handleEditNovel = async () => {
    try {
      const { error } = await supabase
        .from('novels')
        .update({
          title: editedTitle,
          description: editedDescription
        })
        .eq('id', novel?.id);

      if (error) throw error;
      
      setNovel(prev => prev ? {
        ...prev,
        title: editedTitle,
        description: editedDescription
      } : null);
      
      setIsEditingNovel(false);
    } catch (error) {
      console.error('Error updating novel:', error);
      alert('Failed to update novel. Please try again.');
    }
  };

  const handleEditChapterTitle = async (chapterId: number) => {
    try {
      const { error } = await supabase
        .from('chapters')
        .update({ title: editedChapterTitle })
        .eq('id', chapterId)
        .eq('novel_id', novel?.id);

      if (error) throw error;
      
      setNovel(prev => {
        if (!prev) return null;
        return {
          ...prev,
          chapters: prev.chapters.map(ch => 
            ch.id === chapterId ? { ...ch, title: editedChapterTitle } : ch
          )
        };
      });
      
      setIsEditingChapter(null);
    } catch (error) {
      console.error('Error updating chapter title:', error);
      alert('Failed to update chapter title. Please try again.');
    }
  };

  const handleDeleteChapter = async (chapterId: number, chapterNumber: number) => {
    if (!confirm(`Are you sure you want to delete Chapter ${chapterNumber}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('chapters')
        .delete()
        .eq('id', chapterId)
        .eq('novel_id', novel?.id);

      if (error) throw error;

      setNovel(prev => {
        if (!prev) return null;
        return {
          ...prev,
          chapters: prev.chapters.filter(ch => ch.id !== chapterId)
        };
      });
    } catch (error) {
      console.error('Error deleting chapter:', error);
      alert('Failed to delete chapter. Please try again.');
    }
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

  if (!novel) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} 
        flex items-center justify-center`}>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Novel not found</h1>
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

  return (
    <div className={`min-h-screen transition-colors duration-200 ${
      isDark ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column - Cover and Info */}
          <div className="md:col-span-1">
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-4`}>
              <Image 
                src={novel.cover_url || '/api/placeholder/200/300'}
                alt={novel.title}
                width={200}
                height={300}
                className="w-full h-full object-cover rounded-lg"
              />
              {isAuthor && (
                <div className="mt-4">
                  <ImageUpload 
                    onUploadComplete={async (url: string) => {
                      const { error } = await supabase
                        .from('novels')
                        .update({ cover_url: url })
                        .eq('id', novel.id);
                      
                      if (error) {
                        alert('Error updating cover');
                        return;
                      }
                      
                      setNovel(prev => prev ? { ...prev, cover_url: url } : null);
                    }}
                  />
                </div>
              )}
              <div className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Rating</span>
                  <span className="text-yellow-500">★ {novel.rating}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Status</span>
                  <span className={`px-2 py-1 text-sm rounded-full ${
                    novel.status === 'Ongoing' 
                      ? isDark 
                        ? 'bg-green-900/50 text-green-200'
                        : 'bg-green-100 text-green-800'
                      : isDark
                        ? 'bg-blue-900/50 text-blue-200'
                        : 'bg-blue-100 text-blue-800'
                  }`}>{novel.status}</span>
                </div>
                <div className="flex flex-wrap gap-1 pt-2">
                  {novel.tags?.map((tag) => (
                    <span key={tag} className={`px-2 py-1 text-sm rounded-full ${
                      isDark 
                        ? 'bg-red-900/50 text-red-200' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Description and Chapters */}
          <div className="md:col-span-2 space-y-6">
            {/* Title and Author */}
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-6`}>
              {isEditingNovel ? (
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDark ? 'text-gray-200' : 'text-gray-700'
                    }`}>
                      Title
                    </label>
                    <input
                      type="text"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        isDark 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDark ? 'text-gray-200' : 'text-gray-700'
                    }`}>
                      Description
                    </label>
                    <textarea
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      rows={5}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        isDark 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setIsEditingNovel(false)}
                      className={`px-4 py-2 rounded-lg ${
                        isDark 
                          ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleEditNovel}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {novel.title}
                    </h1>
                    {isAuthor && (
                      <button
                        onClick={() => {
                          setEditedTitle(novel.title);
                          setEditedDescription(novel.description || '');
                          setIsEditingNovel(true);
                        }}
                        className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${
                          isDark ? 'text-gray-300' : 'text-gray-600'
                        }`}
                      >
                        <Edit size={18} />
                      </button>
                    )}
                  </div>
                  <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    by {novel.author}
                  </p>
                  <div className="mt-4 whitespace-pre-line">
                    {novel.description}
                  </div>
                </div>
              )}
            </div>

            {/* Chapters */}
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-6`}>
            <div className="flex justify-between items-center mb-4">
  <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
    Chapters
  </h2>
  {isAuthor && (
    <button
      onClick={() => setShowAddChapter(true)}
      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
    >
      <Plus size={18} />
      Add Chapter
    </button>
  )}
</div>

{showAddChapter && (
  <AddChapterModal
    novelId={novel.id}
    currentChapters={novel.chapters}
    onClose={() => setShowAddChapter(false)}
    onSuccess={() => {
      setShowAddChapter(false);
    }}
  />
)}

              <div className="space-y-2">
                {novel.chapters?.map((chapter) => (
                  <div 
                    key={chapter.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      isDark 
                        ? 'hover:bg-gray-700' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <BookOpen size={20} className={isDark ? 'text-gray-400' : 'text-gray-500'} />
                      {isEditingChapter === chapter.id ? (
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            type="text"
                            value={editedChapterTitle}
                            onChange={(e) => setEditedChapterTitle(e.target.value)}
                            className={`flex-1 px-2 py-1 rounded border ${
                              isDark 
                                ? 'bg-gray-700 border-gray-600 text-white' 
                                : 'bg-white border-gray-300 text-gray-900'
                            }`}
                          />
                          <button
                            onClick={() => setIsEditingChapter(null)}
                            className={`p-1 rounded-lg ${
                              isDark 
                                ? 'hover:bg-gray-600 text-gray-300' 
                                : 'hover:bg-gray-200 text-gray-600'
                            }`}
                          >
                            <X size={16} />
                          </button>
                          <button
                            onClick={() => handleEditChapterTitle(chapter.id)}
                            className={`p-1 rounded-lg ${
                              isDark 
                                ? 'hover:bg-green-900/50 text-green-300' 
                                : 'hover:bg-green-100 text-green-600'
                            }`}
                          >
                            <Check size={16} />
                          </button>
                        </div>
                      ) : (
                        <Link 
                          href={`/novels/${novel.id}/chapter/${chapter.chapter_number}`}
                          className="flex-1 flex items-center justify-between"
                        >
                          <span className={`${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                            Chapter {chapter.chapter_number}: {chapter.title}
                          </span>
                          {chapter.is_locked && (
                            <span className={`ml-2 px-2 py-1 text-sm rounded-full ${
                              isDark 
                                ? 'bg-gray-700 text-gray-300' 
                                : 'bg-gray-200 text-gray-700'
                            }`}>
                              Locked
                            </span>
                          )}
                        </Link>
                      )}
                    </div>
                    
                    {isAuthor && (
                      <div className="flex items-center gap-2 ml-4">
                        {!isEditingChapter && (
                          <button
                            onClick={() => {
                              setEditedChapterTitle(chapter.title);
                              setIsEditingChapter(chapter.id);
                            }}
                            className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${
                              isDark ? 'text-gray-300' : 'text-gray-600'
                            }`}
                          >
                            <Edit size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteChapter(chapter.id, chapter.chapter_number)}
                          className={`p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 ${
                            isDark ? 'text-red-300' : 'text-red-600'
                          }`}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}