// src/components/add-chapter-modal.tsx
"use client";

import { useState } from 'react';
import { X } from 'lucide-react';
import { useTheme } from '@/providers/theme-provider';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface AddChapterModalProps {
  novelId: number;
  onClose: () => void;
  onSuccess: (chapterId: number) => void;
}

export default function AddChapterModal({ novelId, onClose, onSuccess }: AddChapterModalProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const router = useRouter();
  
  const [title, setTitle] = useState('');
  const [chapterNumber, setChapterNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('chapters')
        .insert({
          novel_id: novelId,
          chapter_number: parseInt(chapterNumber),
          title: title,
          content: '',
          is_locked: false
        })
        .select()
        .single();

      if (error) throw error;

      // Navigate to the chapter edit page
      router.push(`/novels/${novelId}/chapter/${data.chapter_number}/edit`);
      onSuccess(data.id);
    } catch (err) {
      console.error('Error adding chapter:', err);
      setError('Failed to add chapter. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className={`relative w-full max-w-md rounded-lg shadow-lg p-6 ${
        isDark ? 'bg-gray-800' : 'bg-white'
      }`}>
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-2 rounded-lg ${
            isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-700'
          }`}
        >
          <X size={20} />
        </button>

        <h2 className={`text-xl font-bold mb-4 ${
          isDark ? 'text-white' : 'text-gray-900'
        }`}>
          Add New Chapter
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              isDark ? 'text-gray-200' : 'text-gray-700'
            }`}>
              Chapter Number
            </label>
            <input
              type="number"
              min="1"
              required
              value={chapterNumber}
              onChange={(e) => setChapterNumber(e.target.value)}
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
              Chapter Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full px-4 py-2 rounded-lg border ${
                isDark 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-lg ${
                isDark 
                  ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {isLoading ? 'Adding...' : 'Add & Edit Content'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}