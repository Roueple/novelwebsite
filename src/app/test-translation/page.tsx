"use client";

import { useAuth } from '@/providers/auth-provider';
import TranslationTester from '@/components/translation-tester';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TestTranslationPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // Check authorization after auth loading completes
    if (!loading) {
      if (!user) {
        router.push('/');
      } else {
        // Allow admin and author roles to access this page
        const hasAccess = role === 'admin' || role === 'author';
        
        if (!hasAccess) {
          router.push('/');
        } else {
          setIsAuthorized(true);
        }
      }
    }
  }, [user, role, loading, router]);

  // Show loading state
  if (loading || !isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <main className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-3xl font-bold mb-4 text-center">Translation API Test</h1>
        <p className="mb-8 text-center text-gray-600">
          Use this page to test the DeepSeek Reasoner API integration
        </p>
        
        <TranslationTester />
      </div>
    </main>
  );
}