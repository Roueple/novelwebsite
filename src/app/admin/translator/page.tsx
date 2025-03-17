"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import NovelTranslator from '@/components/novel-translator';
import LoadingSpinner from '@/components/ui/loading-spinner';

export default function NovelTranslatorPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      // Only allow admin and author roles to access this page
      if (!user || (role !== 'admin' && role !== 'author')) {
        router.push('/');
      }
    }
  }, [user, role, loading, router]);

  // Show loading state while checking authentication
  if (loading || !user || (role !== 'admin' && role !== 'author')) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)]">
      <NovelTranslator />
    </div>
  );
}