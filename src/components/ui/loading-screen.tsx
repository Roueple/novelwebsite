// src/components/ui/loading-screen.tsx
import React from 'react';
import LoadingSpinner from './loading-spinner';

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
  return (
    <div className="min-h-screen bg-theme-background text-theme-foreground flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <LoadingSpinner size="lg" />
        <p className="text-xl">{message}</p>
      </div>
    </div>
  );
}