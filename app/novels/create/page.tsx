"use client";

import { useState, useEffect } from 'react'; // Keep useEffect if needed for other things, like auth checks maybe? Otherwise remove.
// import { useTheme } from '@/providers/theme-provider'; // REMOVE
import { ImageUpload } from '@/components/ui/image-upload';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { ArrowLeft, X } from 'lucide-react';
import Image from 'next/image';
import LoadingSpinner from '@/components/ui/loading-spinner'; // Keep if loading state is used

export default function CreateNovel() {
  // const [isMounted, setIsMounted] = useState(false); // REMOVE
  // const { theme } = useTheme(); // REMOVE
  // const [isDark, setIsDark] = useState(false); // REMOVE
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [coverUrl, setCoverUrl] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    author: '',
    description: '',
    tags: '',
    status: 'Ongoing'
  });

  // useEffect(() => { setIsMounted(true); }, []); // REMOVE
  // useEffect(() => { if (isMounted) { setIsDark(theme === 'dark'); } }, [theme, isMounted]); // REMOVE

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('You must be logged in to create a novel.');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('novels')
        .insert([
          {
            ...formData,
            cover_url: coverUrl,
            tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
            rating: 0,
            author_id: user.id
          }
        ])
        .select()
        .single();

      if (error) throw error;

      router.push(`/novels/${data.id}`);
    } catch (error) {
      console.error('Error creating novel:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error creating novel: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // No need for isMounted check here anymore if useTheme is removed
  // if (!isMounted) { ... } // REMOVE

  return (
    // Use theme-aware classes directly
    <div className="min-h-screen bg-background text-foreground"> {/* Use bg-background, text-foreground */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center mb-6">
            <Link
              href="/"
              className="flex items-center gap-2 text-foreground hover:opacity-80" // Use text-foreground
            >
              <ArrowLeft size={20} />
              <span>Back to Home</span>
            </Link>
          </div>

          {/* Use theme-aware classes: bg-card, text-card-foreground, border-border, placeholder-muted-foreground etc. */}
          <div className="bg-card text-card-foreground rounded-lg shadow-lg p-6">
            <h1 className="text-2xl font-bold mb-6 text-foreground"> {/* Use text-foreground */}
              Add New Novel
            </h1>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Cover Upload */}
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground"> {/* Use text-foreground */}
                  Cover Image
                </label>
                {coverUrl ? (
                  <div className="relative w-48 aspect-[2/3] mb-2">
                    <Image
                        src={coverUrl}
                        alt="Cover preview"
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover rounded-md"
                    />
                    <button
                      type="button"
                      onClick={() => setCoverUrl('')}
                      className="absolute top-1 right-1 p-0.5 bg-red-600 text-white rounded-full leading-none hover:bg-red-700"
                      aria-label="Remove cover image"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : null}
                <ImageUpload
                  onUploadComplete={setCoverUrl}
                />
              </div>

              {/* Title */}
              <div>
                <label htmlFor="novel-title" className="block text-sm font-medium mb-2 text-foreground">
                  Title
                </label>
                <input
                  id="novel-title"
                  type="text"
                  required
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border bg-background border-border text-foreground placeholder-muted-foreground" // Use theme classes
                />
              </div>

              {/* Author */}
              <div>
                <label htmlFor="novel-author" className="block text-sm font-medium mb-2 text-foreground">
                  Author
                </label>
                <input
                  id="novel-author"
                  type="text"
                  required
                  value={formData.author}
                  onChange={e => setFormData({ ...formData, author: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border bg-background border-border text-foreground placeholder-muted-foreground" // Use theme classes
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="novel-description" className="block text-sm font-medium mb-2 text-foreground">
                  Description
                </label>
                <textarea
                  id="novel-description"
                  required
                  rows={4}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border bg-background border-border text-foreground placeholder-muted-foreground" // Use theme classes
                />
              </div>

              {/* Tags */}
              <div>
                <label htmlFor="novel-tags" className="block text-sm font-medium mb-2 text-foreground">
                  Tags (comma separated)
                </label>
                <input
                  id="novel-tags"
                  type="text"
                  value={formData.tags}
                  onChange={e => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="Fantasy, Action, Adventure"
                  className="w-full px-4 py-2 rounded-lg border bg-background border-border text-foreground placeholder-muted-foreground" // Use theme classes
                />
              </div>

              {/* Status */}
              <div>
                <label htmlFor="novel-status" className="block text-sm font-medium mb-2 text-foreground">
                  Status
                </label>
                <select
                  id="novel-status"
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border bg-background border-border text-foreground" // Use theme classes
                >
                  <option value="Ongoing">Ongoing</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                // Use primary button styling from shadcn/ui potentially, or keep as is
                className="w-full py-2 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Creating...' : 'Create Novel'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}