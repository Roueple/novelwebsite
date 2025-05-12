// src/app/search/search-results.tsx
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { searchNovels } from '@/lib/api';
import type { Novel } from '@/types';
// import LoadingScreen from '@/components/ui/loading-screen'; // REMOVED
import NotFoundScreen from '@/components/ui/not-found-screen';
import LoadingSpinner from '@/components/ui/loading-spinner'; // Keep for inline loading if needed

// --- Skeleton Component for Search Results ---
function SearchResultSkeletonCard() {
    return (
        <div className="group block bg-card rounded-lg shadow-md overflow-hidden border border-border/10 animate-pulse">
            <div className="aspect-[2/3] relative overflow-hidden bg-muted"></div>
            <div className="p-3 space-y-2">
                <div className="h-5 bg-muted rounded w-3/4"></div> {/* Title Placeholder */}
                <div className="h-3 bg-muted rounded w-1/2"></div> {/* Author Placeholder */}
                <div className="flex flex-wrap gap-1 min-h-[18px]"> {/* Tags Placeholder */}
                    <div className="h-4 w-10 bg-muted rounded-full"></div>
                    <div className="h-4 w-12 bg-muted rounded-full"></div>
                </div>
                <div className="flex justify-between items-center mt-1"> {/* Rating/Status Placeholder */}
                    <div className="h-4 w-8 bg-muted rounded"></div>
                    <div className="h-4 w-12 bg-muted rounded-full"></div>
                </div>
            </div>
        </div>
    );
}

function SearchResultsSkeletonGrid() {
    // Adjust count based on typical grid size
    const skeletonCount = 10;
    return (
         <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
            {[...Array(skeletonCount)].map((_, index) => (
                <SearchResultSkeletonCard key={index} />
            ))}
        </div>
    );
}

// --- Main Component ---
export default function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const [novels, setNovels] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(true); // Still need loading state for API call
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function performSearch() {
      // Keep loading true initially
      setLoading(true);
      setError(null);
      setNovels([]); // Clear previous results immediately

      if (!query) {
        setLoading(false); // Stop loading if no query
        return;
      }

      console.log(`Performing search for: "${query}"`);

      try {
        const results = await searchNovels(query);
        console.log(`Search results for "${query}":`, results);
        setNovels(results);
      } catch (err) {
        console.error('Search error:', err);
        setError('Failed to perform search. Please try again.');
      } finally {
        setLoading(false); // Stop loading after fetch/error
      }
    }

    performSearch();
  }, [query]);

  // --- Render Logic ---

  // Show error screen first if an error occurred
  if (error) {
    return <NotFoundScreen message={error} returnUrl="/" returnText="Back to Home" />;
  }

  return (
    // Render page structure immediately
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6 text-foreground">
          {query ? `Search Results for "${query}"` : 'Search Novels'}
        </h1>

        {/* Show Skeleton Grid while loading */}
        {loading ? (
            <SearchResultsSkeletonGrid />
        ) : novels.length === 0 ? (
            // Show No Results message if loading is done and no novels found
            <div className="text-center py-12">
                <p className="text-xl text-muted-foreground">
                    {query ? 'No novels found matching your search.' : 'Enter a search term above.'}
                </p>
            </div>
        ) : (
            // Show Actual Results Grid
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                {novels.map((novel) => (
                    <Link
                        key={novel.id}
                        href={`/novels/${novel.id}`}
                        className="group block bg-card rounded-lg shadow-md overflow-hidden transition-all duration-200 hover:shadow-xl hover:-translate-y-1 border border-transparent hover:border-primary/20"
                    >
                        <div className="aspect-[2/3] relative overflow-hidden">
                            <Image
                                src={novel.cover_url || '/placeholder-cover.png'}
                                alt={novel.title || 'Novel cover'}
                                fill
                                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                                quality={80}
                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                                placeholder="blur"
                                blurDataURL="/placeholder-cover-blur.png"
                                loading="lazy"
                            />
                        </div>
                        <div className="p-3">
                            <h3 className="font-semibold text-base mb-1 line-clamp-2 text-foreground group-hover:text-primary transition-colors">
                                {novel.title || 'Untitled Novel'}
                            </h3>
                            <p className="text-muted-foreground text-xs mb-2 truncate">{novel.author || 'Unknown Author'}</p>
                            <div className="flex flex-wrap gap-1 mb-2 min-h-[18px]">
                                {novel.tags?.slice(0, 3).map((tag) => (
                                    <span key={tag} className="px-2 py-0.5 text-[10px] rounded-full bg-secondary text-secondary-foreground whitespace-nowrap">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                            <div className="flex justify-between items-center mt-1">
                                <span className="text-yellow-500 text-xs font-bold">★ {novel.rating?.toFixed(1) ?? 'N/A'}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${ novel.status === 'Ongoing' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' }`}>
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