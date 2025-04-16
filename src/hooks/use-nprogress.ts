// src/hooks/use-nprogress.ts
import { useEffect } from 'react';
import NProgress from 'nprogress';
import { usePathname, useSearchParams } from 'next/navigation';

// Import 'nprogress/nprogress.css' in src/app/layout.tsx or src/app/globals.css

export function useNProgress(options?: { showSpinner?: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    NProgress.configure({ showSpinner: options?.showSpinner ?? false });

    // We use the change in pathname or searchParams as the signal
    // This means NProgress starts *slightly after* navigation begins.
    NProgress.start();

    // The cleanup function of useEffect runs when the component unmounts
    // or before the effect runs again due to dependency changes.
    // This signals the end of the navigation/rendering for the *previous* path.
    return () => {
      NProgress.done();
    };
  }, [pathname, searchParams, options?.showSpinner]); // Re-run effect when path or search params change
}