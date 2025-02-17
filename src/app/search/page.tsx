import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import SearchResults from './search-results';

export default function SearchPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchResults />
    </Suspense>
  );
}