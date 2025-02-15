"use client";

import { useState, useEffect } from 'react';
import { Search, Filter, Moon, Sun, Plus } from 'lucide-react';
import { useTheme } from '@/providers/theme-provider';
import Link from 'next/link';
import { getLatestNovels } from '@/lib/api';
import type { Novel } from '@/types/supabase';
import { useAuth } from '@/providers/auth-provider';


export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const { user, role } = useAuth();
  const isDark = theme === 'dark';
  const [novels, setNovels] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadNovels() {
      try {
        const data = await getLatestNovels();
        setNovels(data);
      } catch (err) {
        setError('Failed to load novels');
        console.error('Error loading novels:', err);
      } finally {
        setLoading(false);
      }
    }
    loadNovels();
  }, []);

  if (loading) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} 
        flex items-center justify-center`}>
        <div className={`text-xl ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Loading...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} 
        flex items-center justify-center`}>
        <div className={`text-xl ${isDark ? 'text-red-400' : 'text-red-600'}`}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-200 ${
      isDark ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      {/* Header with Search */}
      <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow sticky top-0 z-10`}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search novels..."
                className={`w-full px-4 py-2 pr-10 rounded-lg border ${
                  isDark 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:outline-none focus:border-red-500`}
              />
              <Search className="absolute right-3 top-2.5 text-gray-400" size={20} />
            </div>
            <button className={`p-2 rounded-lg border ${
              isDark 
                ? 'border-gray-600 hover:bg-gray-700' 
                : 'border-gray-300 hover:bg-gray-50'
            }`}>
              <Filter size={20} className={isDark ? 'text-gray-300' : 'text-gray-600'} />
            </button>
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

 {/* Conditionally render "Add Novel" button based on user role */}
 {(role === 'admin' || role === 'author') && (
              <Link
                href="/novels/create"
                className={`p-2 rounded-lg border flex items-center gap-2 ${
                  isDark 
                    ? 'border-gray-600 hover:bg-gray-700 text-gray-200' 
                    : 'border-gray-300 hover:bg-gray-50 text-gray-600'
                }`}
              >
                <Plus size={20} />
                <span>Add Novel</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      

      {/* Novel Grid */}
      <div className="container mx-auto px-4 py-8">
        {novels.length === 0 ? (
          <div className="text-center py-12">
            <p className={`text-xl ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              No novels found
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {novels.map((novel) => (
              <Link 
                key={novel.id} 
                href={`/novels/${novel.id}`}
                className={`block ${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg overflow-hidden 
                  hover:shadow-xl transition-all duration-200 hover:-translate-y-1`}
              >
                <div className="aspect-[2/3] relative">
                  <img 
                    src={novel.cover_url || '/api/placeholder/200/300'} 
                    alt={novel.title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <h3 className={`font-bold text-lg mb-1 line-clamp-2 ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>{novel.title}</h3>
                  <p className={`${
                    isDark ? 'text-gray-400' : 'text-gray-600'
                  } text-sm mb-2`}>{novel.author}</p>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {novel.tags?.map((tag) => (
                      <span key={tag} className={`px-2 py-1 text-xs rounded-full ${
                        isDark 
                          ? 'bg-red-900/50 text-red-200' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-yellow-500">★ {novel.rating?.toFixed(1)}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      novel.status === 'Ongoing' 
                        ? isDark 
                          ? 'bg-green-900/50 text-green-200'
                          : 'bg-green-100 text-green-800'
                        : isDark
                          ? 'bg-blue-900/50 text-blue-200'
                          : 'bg-blue-100 text-blue-800'
                    }`}>
                      {novel.status}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}