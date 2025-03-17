"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import NovelTranslator from '@/components/novel-translator';
import LoadingSpinner from '@/components/ui/loading-spinner';

export default function NovelTranslatorPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // If not authorized, show a message instead of redirecting
  if (!user || (role !== 'admin' && role !== 'author')) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center p-6 max-w-md bg-white rounded-lg shadow-lg">
          <h1 className="text-xl font-bold mb-4">Access Restricted</h1>
          <p className="mb-4">You need admin or author permissions to access this page.</p>
          <button 
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  // User is authorized
  return (
    <div className="h-[calc(100vh-64px)]">
      <NovelTranslator />
    </div>
  );
}