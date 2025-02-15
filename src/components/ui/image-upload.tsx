"use client";

import { useState } from 'react';
import { uploadCover } from '@/lib/upload';

interface ImageUploadProps {
  onUploadComplete: (url: string) => void;
  className?: string;
}

export function ImageUpload({ onUploadComplete, className = '' }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      // Check file type
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
      }

      // Check file size (e.g., 5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }

      setUploading(true);
      const url = await uploadCover(file);
      onUploadComplete(url);
    } catch (error) {
      console.error('Error:', error);
      alert('Error uploading image');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={className}>
      <label className="block">
        <span className="sr-only">Choose cover image</span>
        <input
          type="file"
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-red-50 file:text-red-700
            hover:file:bg-red-100
            disabled:opacity-50 disabled:cursor-not-allowed"
          accept="image/*"
          onChange={handleFileChange}
          disabled={uploading}
        />
      </label>
      {uploading && (
        <div className="mt-2 text-sm text-gray-500">
          Uploading...
        </div>
      )}
    </div>
  );
}