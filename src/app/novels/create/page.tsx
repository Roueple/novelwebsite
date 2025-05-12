// src/app/novels/create/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase'; // Your Supabase client
import { useAuth } from '@/providers/auth-provider'; // To get user ID for author_id
import Link from 'next/link';
import { ArrowLeft, X, UploadCloud, Save } from 'lucide-react'; // Added Save
import Image from 'next/image';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { Input } from '@/components/ui/input'; // Assuming you use these
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ImageUpload } from '@/components/ui/image-upload'; // Assuming this is your component
import { toast } from 'sonner'; // For notifications

// Define an interface for your form data state
interface NovelFormData {
  title: string;
  author: string;
  description: string;
  tags: string; // Input as comma-separated string, will be converted to string[] on submit
  status: 'Ongoing' | 'Completed'; // Strict type for status
}

export default function CreateNovelPage() { // Renamed component for clarity
  const router = useRouter();
  const { user } = useAuth(); // Get the authenticated user

  const [formData, setFormData] = useState<NovelFormData>({
    title: '',
    author: '',
    description: '',
    tags: '',
    status: 'Ongoing', // Default value matches the strict type
  });
  const [coverUrl, setCoverUrl] = useState<string | null>(null); // Allow null for cover
  const [isSubmitting, setIsSubmitting] = useState(false); // Changed from 'loading' to 'isSubmitting'

  // If user is not logged in, you might want to redirect or disable the form.
  // For simplicity, this example assumes an admin role check is done higher up or this page is protected.
  useEffect(() => {
    if (!user) {
      // toast.error("You must be logged in to create a novel.");
      // router.push('/login'); // Or show a message
    }
  }, [user, router]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'status' ? value as 'Ongoing' | 'Completed' : value,
    }));
  };

  const handleCoverUploadComplete = (url: string) => {
    setCoverUrl(url);
  };

  const handleRemoveCover = () => {
    setCoverUrl(null);
    // If you also need to delete from storage, add that logic here or in ImageUpload
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Authentication error. Please log in again.");
      setIsSubmitting(false);
      return;
    }
    if (!formData.title.trim() || !formData.author.trim()) {
        toast.error("Title and Author are required.");
        setIsSubmitting(false);
        return;
    }

    setIsSubmitting(true);
    toast.loading("Creating novel...");

    try {
      // Prepare the data for insertion, ensuring types match the database schema
      const novelToInsert = {
        title: formData.title.trim(),
        author: formData.author.trim(),
        description: formData.description.trim() || null, // Handle empty description as null if DB allows
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0), // string[]
        status: formData.status, // Already correctly typed 'Ongoing' | 'Completed'
        cover_url: coverUrl,
        author_id: user.id, // Link to the authenticated user who is creating it
        rating: 0, // Default rating, ensure this matches your DB schema for novels.rating type
        // Add any other required fields from your 'novels' table Insert type
        // e.g., is_hidden: false, like_count: 0, view_count: 0 if they have defaults or are needed
      };

      const { data: newNovel, error } = await supabase
        .from('novels')
        .insert(novelToInsert) // Pass a single object, not an array if inserting one
        .select()
        .single();

      if (error) throw error;

      toast.dismiss();
      toast.success("Novel created successfully!");
      if (newNovel) {
        router.push(`/novels/${newNovel.id}/edit`); // Redirect to edit page for the new novel
      } else {
        router.push('/'); // Fallback redirect
      }
    } catch (error: any) {
      toast.dismiss();
      console.error('Error creating novel:', error);
      toast.error(`Error creating novel: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center mb-6">
            <Button variant="ghost" size="sm" asChild onClick={() => router.back()} className="text-muted-foreground hover:text-foreground">
              {/* Using router.back() or Link to a specific page */}
              <>
                <ArrowLeft size={16} className="mr-1" />
                Back
              </>
            </Button>
          </div>

          <div className="bg-card text-card-foreground rounded-lg shadow-lg p-6 sm:p-8">
            <h1 className="text-2xl font-bold mb-6 text-foreground">
              Add New Novel
            </h1>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="novel-cover" className="block text-sm font-medium mb-1 text-foreground">
                  Cover Image
                </label>
                {coverUrl && (
                  <div className="relative w-32 h-48 mb-2 group"> {/* Adjusted size for consistency */}
                    <Image
                      src={coverUrl}
                      alt="Cover preview"
                      fill
                      sizes="(max-width: 128px) 100vw, 128px"
                      className="object-cover rounded-md border border-border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={handleRemoveCover}
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Remove cover image"
                    >
                      <X size={14} />
                    </Button>
                  </div>
                )}
                <ImageUpload
                  onUploadComplete={handleCoverUploadComplete}
                  // Pass any existing coverUrl if ImageUpload supports showing/replacing it
                />
              </div>

              <div>
                <label htmlFor="title" className="block text-sm font-medium mb-1 text-foreground">
                  Title <span className="text-destructive">*</span>
                </label>
                <Input
                  id="title"
                  name="title"
                  type="text"
                  required
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label htmlFor="author" className="block text-sm font-medium mb-1 text-foreground">
                  Author <span className="text-destructive">*</span>
                </label>
                <Input
                  id="author"
                  name="author"
                  type="text"
                  required
                  value={formData.author}
                  onChange={handleChange}
                  className="w-full"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium mb-1 text-foreground">
                  Description
                </label>
                <Textarea
                  id="description"
                  name="description"
                  rows={5}
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label htmlFor="tags" className="block text-sm font-medium mb-1 text-foreground">
                  Tags (comma separated)
                </label>
                <Input
                  id="tags"
                  name="tags"
                  type="text"
                  value={formData.tags}
                  onChange={handleChange}
                  placeholder="Fantasy, Action, Adventure"
                  className="w-full"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium mb-1 text-foreground">
                  Status <span className="text-destructive">*</span>
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full h-9 px-3 py-1 rounded-md border bg-background border-input text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  <option value="Ongoing">Ongoing</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting || !user || !formData.title || !formData.author}
                  className="min-w-[120px]"
                >
                  {isSubmitting ? <LoadingSpinner className="mr-2" size="sm"/> : <Save size={16} className="mr-2" />}
                  {isSubmitting ? 'Creating...' : 'Create Novel'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}