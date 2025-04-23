// src/app/search/search-results.tsx
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { searchNovels } from '@/lib/api';
import type { Novel } from '@/types/supabase';
import LoadingScreen from '@/components/ui/loading-screen'; // Import LoadingScreen
import NotFoundScreen from '@/components/ui/not-found-screen'; // Import NotFoundScreen

export default function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const [novels, setNovels] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function performSearch() {
      // Reset state for new search
      setLoading(true);
      setError(null);
      setNovels([]);

      if (!query) {
        setLoading(false);
        return; // No query, nothing to search
      }

      console.log(`Performing search for: "${query}"`); // Log search query

      try {
        const results = await searchNovels(query);
        console.log(`Search results for "${query}":`, results); // Log results
        setNovels(results);
      } catch (err) {
        console.error('Search error:', err);
        setError('Failed to perform search. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    performSearch();
  }, [query]); // Re-run search when query changes

  if (loading) {
    return <LoadingScreen message={`Searching for "${query}"...`} />;
  }

  if (error) {
    // Use NotFoundScreen for a consistent error display
    return <NotFoundScreen message={error} returnUrl="/" returnText="Back to Home" />;
  }

  return (
    // Use theme-aware colors
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6 text-foreground">
          Search Results for &quot;{query}&quot;
        </h1>

        {novels.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-xl text-muted-foreground">No novels found matching your search.</p> {/* Use theme color */}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
            {novels.map((novel) => (
              <Link
                key={novel.id}
                href={`/novels/${novel.id}`}
                className="group block bg-card rounded-lg shadow-md overflow-hidden transition-all duration-200 hover:shadow-xl hover:-translate-y-1 border border-transparent hover:border-primary/20" // Use theme colors
              >
                <div className="aspect-[2/3] relative overflow-hidden">
                  <Image
                    src={novel.cover_url || '/placeholder-cover.png'} // Use local placeholder
                    alt={novel.title || 'Novel cover'}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw" // Sizes similar to homepage
                    quality={80} // Consistent quality
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    placeholder="blur" // Use blur placeholder
                    blurDataURL="/placeholder-cover-blur.png" // Provide blur placeholder URL
                    loading="lazy" // Lazy load search results images
                  />
                </div>
                 <div className="p-3"> {/* Consistent padding */}
                    <h3 className="font-semibold text-base mb-1 line-clamp-2 text-foreground group-hover:text-primary transition-colors">
                      {novel.title || 'Untitled Novel'}
                    </h3>
                    <p className="text-muted-foreground text-xs mb-2 truncate">{novel.author || 'Unknown Author'}</p>
                    <div className="flex flex-wrap gap-1 mb-2 min-h-[18px]">
                      {novel.tags?.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 text-[10px] rounded-full bg-secondary text-secondary-foreground whitespace-nowrap"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-yellow-500 text-xs font-bold">★ {novel.rating?.toFixed(1) ?? 'N/A'}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          novel.status === 'Ongoing'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
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