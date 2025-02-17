// src/components/search-nav.tsx
"use client";

import { Search, Filter, Plus } from 'lucide-react';
import { useTheme } from '@/providers/theme-provider';
import Link from 'next/link';
import { useAuth } from '@/providers/auth-provider';

export default function SearchNav() {
  const { theme } = useTheme();
  const { role } = useAuth();
  const isDark = theme === 'dark';

  return (
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
  );
}