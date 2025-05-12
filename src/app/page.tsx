// src/app/page.tsx
import { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getLatestNovels } from '@/lib/api';
import type { Novel } from '@/types';
import LoadingSpinner from '@/components/ui/loading-spinner'; // For Suspense fallback

export const revalidate = 60;

// --- Inner Component to Display Novels ---
async function LatestNovelsList() {
  let novels: Novel[] = [];
  let error: string | null = null;

  try {
    novels = await getLatestNovels(); // Fetch data on the server
  } catch (err) {
    error = 'Failed to load novels. Please try again later.';
    console.error('Error loading novels:', err);
    // In a real app, you might log this error to a monitoring service
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-xl text-destructive">{error}</p>
      </div>
    );
  }

  if (novels.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-xl text-muted-foreground">No novels found.</p> {/* Use theme color */}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
      {novels.map((novel) => (
        <Link
          key={novel.id}
          href={`/novels/${novel.id}`}
          className="group block bg-card rounded-lg shadow-md overflow-hidden transition-all duration-200 hover:shadow-xl hover:-translate-y-1 border border-transparent hover:border-primary/20" // Use theme colors, add subtle hover border
        >
          <div className="aspect-[2/3] relative overflow-hidden"> {/* Ensure image doesn't overflow */}
            <Image
              src={novel.cover_url || '/placeholder-cover.png'} // Use a local or consistent placeholder
              alt={novel.title || 'Novel cover'}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
              quality={80} // Slightly adjusted quality
              className="object-cover transition-transform duration-300 group-hover:scale-105" // Add subtle zoom on hover
              // Add placeholder and consider priority for the first few images if applicable
              placeholder="blur" // Use blur placeholder if generating base64 locally or have URLs
              blurDataURL="/placeholder-cover-blur.png" // Provide a small blurred placeholder
              // loading="lazy" // Default is lazy, keep unless it's above the fold
            />
          </div>
          <div className="p-3"> {/* Slightly reduced padding */}
            <h3 className="font-semibold text-base mb-1 line-clamp-2 text-foreground group-hover:text-primary transition-colors"> {/* Adjusted size, hover color */}
              {novel.title || 'Untitled Novel'}
            </h3>
            <p className="text-muted-foreground text-xs mb-2 truncate">{novel.author || 'Unknown Author'}</p> {/* Use theme color, truncate */}
            <div className="flex flex-wrap gap-1 mb-2 min-h-[18px]"> {/* Set min height to prevent layout shift */}
              {novel.tags?.slice(0, 3).map((tag) => ( // Limit displayed tags
                <span
                  key={tag}
                  className="px-2 py-0.5 text-[10px] rounded-full bg-secondary text-secondary-foreground whitespace-nowrap" // Adjusted size, use theme colors
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
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' // Use theme-aware colors
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
  );
}


// --- Main Page Component (Server Component) ---
export default function Home() {
  return (
    // Use theme-aware colors directly
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      {/* Header is handled in layout.tsx */}
      <div className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-6 text-foreground">Latest Novels</h2> {/* Optional: Add a heading */}
        {/* Use Suspense for better loading feedback */}
        <Suspense fallback={<LoadingFallback />}>
          {/* Remove the unused @ts-expect-error directive here */}
          <LatestNovelsList />
        </Suspense>
      </div>
    </div>
  );
}

// --- Fallback UI for Suspense ---
function LoadingFallback() {
  return (
    <div className="flex justify-center items-center py-20">
       <LoadingSpinner size="lg" />
       <span className="ml-3 text-muted-foreground">Loading novels...</span>
    </div>
  );
}