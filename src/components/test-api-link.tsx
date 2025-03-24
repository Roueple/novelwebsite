"use client";

import Link from 'next/link';

export default function TestApiLink() {
  return (
    <Link 
      href="/api-test" 
      className="fixed bottom-4 right-4 z-50 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-blue-600"
    >
      API Test
    </Link>
  );
}