"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getLatestNovels } from '@/lib/api';
import type { Novel } from '@/types/supabase';
import Image from 'next/image';

export default function Home() {
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
      <div className="min-h-screen bg-theme-background text-theme-foreground flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-theme-background text-theme-foreground flex items-center justify-center">
        <div className="text-xl text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-theme-background text-theme-foreground transition-colors duration-200">

      {/* Novel Grid */}
      <div className="container mx-auto px-4 py-8">
        {novels.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-xl text-theme-muted">No novels found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {novels.map((novel) => (
              <Link
                key={novel.id}
                href={`/novels/${novel.id}`}
                className="block bg-theme-card rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-all duration-200 hover:-translate-y-1"
              >
                <div className="aspect-[2/3] relative">
                  <Image
                    src={novel.cover_url || '/api/placeholder/200/300'}
                    alt={novel.title}
                    width={200}
                    height={300}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-lg mb-1 line-clamp-2 text-theme-foreground">
                    {novel.title}
                  </h3>
                  <p className="text-theme-muted text-sm mb-2">{novel.author}</p>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {novel.tags?.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 text-xs rounded-full bg-red-200 text-red-800"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-yellow-500">★ {novel.rating?.toFixed(1)}</span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        novel.status === 'Ongoing'
                          ? 'bg-green-200 text-green-800'
                          : 'bg-blue-200 text-blue-800'
                      }`}
                    >
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