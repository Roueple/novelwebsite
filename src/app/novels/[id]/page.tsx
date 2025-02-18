"use client";

import { useState, useEffect } from 'react';
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
  const { user, role } = useAuth();
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
      <div className="min-h-screen bg-theme-background text-theme-foreground flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!novel) {
    return (
      <div className="min-h-screen bg-theme-background text-theme-foreground flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Novel not found</h1>
          <Link 
            href="/"
            className="px-4 py-2 rounded-lg bg-theme-card hover:bg-opacity-80 shadow transition-colors"
          >
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-theme-background text-theme-foreground transition-colors duration-200">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column - Cover and Info */}
          <div className="md:col-span-1">
          <div className="relative aspect-[2/3] w-full">
                <Image 
                  src={novel.cover_url || '/api/placeholder/400/600'}
                  alt={novel.title}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 800px"
                  quality={95}
                  priority
                  className="rounded-lg object-cover"
                  style={{ transform: 'translate3d(0, 0, 0)' }}
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
                  <span className="font-medium text-theme-foreground">Rating</span>
                  <span className="text-yellow-500">★ {novel.rating}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-theme-foreground">Status</span>
                  <span className={`px-2 py-1 text-sm rounded-full ${
                    novel.status === 'Ongoing' 
                      ? 'bg-green-200 text-green-800'
                      : 'bg-blue-200 text-blue-800'
                  }`}>
                    {novel.status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 pt-2">
                  {novel.tags?.map((tag) => (
                    <span key={tag} className="px-2 py-1 text-sm rounded-full bg-red-200 text-red-800">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Description and Chapters */}
          <div className="md:col-span-2 space-y-6">
            {/* Title and Description Section */}
            <div className="bg-theme-card rounded-lg shadow-lg p-6">
              {isEditingNovel ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-theme-foreground">
                      Title
                    </label>
                    <input
                      type="text"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border bg-theme-background text-theme-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-theme-foreground">
                      Description
                    </label>
                    <textarea
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      rows={5}
                      className="w-full px-4 py-2 rounded-lg border bg-theme-background text-theme-foreground"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setIsEditingNovel(false)}
                      className="px-4 py-2 rounded-lg bg-theme-card text-theme-muted hover:bg-opacity-80"
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
                    <h1 className="text-3xl font-bold text-theme-foreground">{novel.title}</h1>
                    {isAuthor && (
                      <button
                        onClick={() => {
                          setEditedTitle(novel.title);
                          setEditedDescription(novel.description || '');
                          setIsEditingNovel(true);
                        }}
                        className="p-2 rounded-lg hover:bg-theme-background text-theme-muted"
                      >
                        <Edit size={18} />
                      </button>
                    )}
                  </div>
                  <p className="text-theme-muted">by {novel.author}</p>
                  <div className="mt-4 whitespace-pre-line text-theme-foreground">
                    {novel.description}
                  </div>
                </div>
              )}
            </div>

            {/* Chapters Section */}
            <div className="bg-theme-card rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-theme-foreground">Chapters</h2>
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
                  onSuccess={() => setShowAddChapter(false)}
                />
              )}

              {/* Inside the space-y-2 div in the Chapters Section */}
<div className="space-y-2">
  {novel.chapters?.map((chapter) => (
    <div 
      key={chapter.id}
      className="flex items-center justify-between p-3 rounded-lg hover:bg-theme-background transition-colors"
    >
      <div className="flex items-center gap-3 flex-1">
        <BookOpen size={20} className="text-theme-muted" />
        {isEditingChapter === chapter.id ? (
          <div className="flex-1 flex items-center gap-2">
            <input
              type="text"
              value={editedChapterTitle}
              onChange={(e) => setEditedChapterTitle(e.target.value)}
              className="flex-1 px-2 py-1 rounded border bg-theme-background text-theme-foreground"
            />
            <button
              onClick={() => setIsEditingChapter(null)}
              className="p-1 rounded-lg hover:bg-theme-background text-theme-muted"
            >
              <X size={16} />
            </button>
            <button
              onClick={() => handleEditChapterTitle(chapter.id)}
              className="p-1 rounded-lg text-green-600 hover:bg-green-100"
            >
              <Check size={16} />
            </button>
          </div>
        ) : (
          <Link 
            href={`/novels/${novel.id}/chapter/${chapter.chapter_number}`}
            className="flex-1 flex items-center justify-between"
          >
            <span className="text-theme-foreground">
              Chapter {chapter.chapter_number}: {chapter.title}
            </span>
            {chapter.is_locked && (
              <span className="ml-2 px-2 py-1 text-sm rounded-full bg-theme-background text-theme-muted">
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
              className="p-2 rounded-lg hover:bg-theme-background text-theme-muted"
            >
              <Edit size={18} />
            </button>
          )}
          <button
            onClick={() => handleDeleteChapter(chapter.id, chapter.chapter_number)}
            className="p-2 rounded-lg hover:bg-red-100 text-red-600"
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