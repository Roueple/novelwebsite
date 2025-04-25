// src/hooks/use-nprogress.ts (REVISED)
import { useEffect, useRef } from 'react'; // Import useRef
import NProgress from 'nprogress';
import { usePathname, useSearchParams } from 'next/navigation';

// Import 'nprogress/nprogress.css' in src/app/layout.tsx or src/app/globals.css

export function useNProgress(options?: { showSpinner?: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPath = useRef<string | null>(null); // Keep track of the path

  useEffect(() => {
    NProgress.configure({ showSpinner: options?.showSpinner ?? false });

    const newPath = `${pathname}?${searchParams}`; // Combine pathname and params

    // Check if the path has actually changed
    if (currentPath.current !== newPath) {
      // If there was a previous path, ensure NProgress.done() is called for it
      if (currentPath.current !== null) {
        NProgress.done();
      }
      // Start NProgress for the new navigation
      NProgress.start();
      currentPath.current = newPath; // Update the current path
    }

    // It's crucial NProgress.done() is called reliably.
    // While the above logic helps, edge cases might still exist.
    // A small delay in done() can sometimes help visually, but isn't a perfect fix.
    // const timer = setTimeout(() => NProgress.done(), 500); // Optional: slight delay

    // Cleanup: Ensure NProgress is marked as done when the component unmounts
    // or just before the effect runs for a *new* path.
    return () => {
      // clearTimeout(timer); // Clear timer if using delay
      NProgress.done();
    };
  }, [pathname, searchParams, options?.showSpinner]); // Dependencies remain the same
}