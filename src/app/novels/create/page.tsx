"use client";

import { useState, useEffect } from 'react';
import { useTheme } from '@/providers/theme-provider';
import { ImageUpload } from '@/components/ui/image-upload';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { ArrowLeft, X } from 'lucide-react'; // <--- ADD X HERE
import Image from 'next/image';
import LoadingSpinner from '@/components/ui/loading-spinner';

export default function CreateNovel() {
  const [isMounted, setIsMounted] = useState(false);
  const { theme } = useTheme();
  const [isDark, setIsDark] = useState(false);
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [coverUrl, setCoverUrl] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    author: '',
    description: '',
    tags: '',
    status: 'Ongoing'
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted) {
      setIsDark(theme === 'dark');
    }
  }, [theme, isMounted]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('You must be logged in to create a novel.');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('novels')
        .insert([
          {
            ...formData,
            cover_url: coverUrl,
            tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag), // Filter empty tags
            rating: 0,
            author_id: user.id // Associate with logged-in user
          }
        ])
        .select()
        .single();

      if (error) throw error;

      router.push(`/novels/${data.id}`);
    } catch (error) {
      console.error('Error creating novel:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error creating novel: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center mb-6">
            <Link
              href="/"
              className={`flex items-center gap-2 ${
                isDark ? 'text-gray-200' : 'text-gray-700'
              } hover:opacity-80`}
            >
              <ArrowLeft size={20} />
              <span>Back to Home</span>
            </Link>
          </div>

          <div className={`${
            isDark ? 'bg-gray-800' : 'bg-white'
          } rounded-lg shadow-lg p-6`}>
            <h1 className={`text-2xl font-bold mb-6 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              Add New Novel
            </h1>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Cover Upload */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  Cover Image
                </label>
                {coverUrl ? (
                  <div className="relative w-48 aspect-[2/3] mb-2">
                    <Image
                        src={coverUrl}
                        alt="Cover preview"
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover rounded-md"
                    />
                    <button
                      type="button"
                      onClick={() => setCoverUrl('')}
                      className="absolute top-1 right-1 p-0.5 bg-red-600 text-white rounded-full leading-none hover:bg-red-700"
                      aria-label="Remove cover image"
                    >
                      <X size={14} /> {/* X is now defined */}
                    </button>
                  </div>
                ) : null}
                <ImageUpload
                  onUploadComplete={setCoverUrl}
                />
              </div>

              {/* Title */}
              <div>
                <label htmlFor="novel-title" className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  Title
                </label>
                <input
                  id="novel-title"
                  type="text"
                  required
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDark
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              {/* Author */}
              <div>
                <label htmlFor="novel-author" className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  Author
                </label>
                <input
                  id="novel-author"
                  type="text"
                  required
                  value={formData.author}
                  onChange={e => setFormData({ ...formData, author: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDark
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="novel-description" className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  Description
                </label>
                <textarea
                  id="novel-description"
                  required
                  rows={4}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDark
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              {/* Tags */}
              <div>
                <label htmlFor="novel-tags" className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  Tags (comma separated)
                </label>
                <input
                  id="novel-tags"
                  type="text"
                  value={formData.tags}
                  onChange={e => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="Fantasy, Action, Adventure"
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDark
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              {/* Status */}
              <div>
                <label htmlFor="novel-status" className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  Status
                </label>
                <select
                  id="novel-status"
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDark
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="Ongoing">Ongoing</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-2 px-4 rounded-lg bg-red-600 text-white
                  hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
              >
                {loading ? 'Creating...' : 'Create Novel'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}