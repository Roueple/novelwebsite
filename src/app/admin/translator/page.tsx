// src/app/admin/translator/page.tsx
"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import NovelTranslator from '@/components/novel-translator';
import LoadingSpinner from '@/components/ui/loading-spinner';
import DeepSeekTestConnection from '@/components/deepseek-test-connection';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function NovelTranslatorPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [showApiTest, setShowApiTest] = useState(false);

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
      {/* API Test Button */}
      <div className="absolute top-20 right-4 z-10">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowApiTest(true)}
        >
          Test API Connection
        </Button>
      </div>

      {/* API Test Dialog */}
      <Dialog open={showApiTest} onOpenChange={setShowApiTest}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>DeepSeek API Connection Test</DialogTitle>
          </DialogHeader>
          <DeepSeekTestConnection />
        </DialogContent>
      </Dialog>

      {/* Main Translator Component */}
      <NovelTranslator />
    </div>
  );
}