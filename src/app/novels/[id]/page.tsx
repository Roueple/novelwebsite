"use client";

import { useState, useEffect } from 'react';
import { useTheme } from '@/providers/theme-provider';
import { BookOpen } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ImageUpload } from '@/components/ui/image-upload';
import { supabase } from '@/lib/supabase';
import { getNovel } from '@/lib/api';
import type { NovelType } from '@/types/supabase';
import Image from 'next/image';

export default function NovelPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const params = useParams();
  const novelId = Number(params.id);
  
  const [novel, setNovel] = useState<NovelType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadNovel() {
      const data = await getNovel(novelId);
      setNovel(data);
      setLoading(false);
    }
    loadNovel();
  }, [novelId]);

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
                    
                    window.location.reload();
                  }}
                />
              </div>
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
              <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {novel.title}
              </h1>
              <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                by {novel.author}
              </p>
            </div>

            {/* Description */}
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-6`}>
              <h2 className={`text-xl font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Synopsis
              </h2>
              <p className={`whitespace-pre-line ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                {novel.description}
              </p>
            </div>

            {/* Chapters */}
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-6`}>
              <h2 className={`text-xl font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Chapters
              </h2>
              <div className="space-y-2">
                {novel.chapters?.map((chapter) => (
                  <Link 
                    key={chapter.id}
                    href={`/novels/${novel.id}/chapter/${chapter.chapter_number}`}
                  >
                    <div className={`flex items-center justify-between p-3 rounded-lg ${
                      isDark 
                        ? 'hover:bg-gray-700' 
                        : 'hover:bg-gray-50'
                    }`}>
                      <div className="flex items-center gap-3">
                        <BookOpen size={20} className={isDark ? 'text-gray-400' : 'text-gray-500'} />
                        <span className={`${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                          Chapter {chapter.chapter_number}: {chapter.title}
                        </span>
                      </div>
                      {chapter.is_locked && (
                        <span className={`px-2 py-1 text-sm rounded-full ${
                          isDark 
                            ? 'bg-gray-700 text-gray-300' 
                            : 'bg-gray-200 text-gray-700'
                        }`}>
                          Locked
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}