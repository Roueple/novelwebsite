// src/components/reading/reading-view.tsx
"use client";

import React from 'react';

interface ReaderViewProps {
  title: string;
  chapterTitle: string;
  content: string;
}

export default function ReaderView({ title, chapterTitle, content }: ReaderViewProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-8">
      <h1 className="text-2xl font-bold mb-4">{title}</h1>
      <h2 className="text-xl font-semibold mb-6">{chapterTitle}</h2>
      <div className="prose max-w-none">
        {content.split('\n').map((paragraph, index) => (
          <p key={index} className="mb-4">
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  );
}