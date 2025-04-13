// src/components/ui/not-found-screen.tsx
import React from 'react';
import Link from 'next/link';
import { BookX } from 'lucide-react';

interface NotFoundScreenProps {
  message: string;
  returnUrl: string;
  returnText?: string;
}

export default function NotFoundScreen({ 
  message, 
  returnUrl, 
  returnText = 'Return to Previous Page' 
}: NotFoundScreenProps) {
  return (
    <div className="min-h-screen bg-theme-background text-theme-foreground flex items-center justify-center">
      <div className="text-center">
        <BookX size={64} className="mx-auto mb-6 text-theme-muted" />
        <h1 className="text-2xl font-bold mb-4">{message}</h1>
        <Link 
          href={returnUrl}
          className="px-4 py-2 rounded-lg bg-theme-card hover:bg-opacity-80 shadow transition-colors inline-block"
        >
          {returnText}
        </Link>
      </div>
    </div>
  );
}