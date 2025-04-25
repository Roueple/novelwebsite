// src/components/search-nav.tsx
"use client";

import { Search, Filter, Plus } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/providers/auth-provider'; // Import useAuth

export default function SearchNav() {
  // Destructure role and isCreator from useAuth
  const { role, isCreator } = useAuth();

  return (
    <div className="bg-theme-card shadow sticky top-0 z-10">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search novels..."
              className="w-full px-4 py-2 pr-10 rounded-lg border bg-theme-input border-theme-border text-theme-foreground placeholder-theme-muted focus:outline-none focus:border-red-500"
            />
            <Search className="absolute right-3 top-2.5 text-theme-muted" size={20} />
          </div>
          <button className="p-2 rounded-lg border border-theme-border hover:bg-theme-hover">
            <Filter size={20} className="text-theme-muted" />
          </button>

          {/* Show Add Novel button if role is admin OR if user is a creator */}
          {(role === 'admin' || isCreator) && (
            <Link
              href="/novels/create"
              className="p-2 rounded-lg border border-theme-border hover:bg-theme-hover flex items-center gap-2 text-theme-foreground"
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
