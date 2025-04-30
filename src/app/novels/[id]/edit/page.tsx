// src/app/novels/[id]/edit/page.tsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
// --- FIX: Added BookOpen import ---
import { ArrowLeft, X, Save, UploadCloud, BookOpen } from 'lucide-react';
// --- END FIX ---
import { useAuth } from '@/providers/auth-provider';
import AdminRoleCheck from '@/components/auth/admin-role-check';
import { getNovel, updateNovelDetails } from '@/lib/api';
import type { Novel } from '@/types/supabase';
import { ImageUpload } from '@/components/ui/image-upload';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/ui/loading-spinner';
import NotFoundScreen from '@/components/ui/not-found-screen';

export default function EditNovelPage() {
    const { user, role, loading: authLoading } = useAuth();
    const params = useParams();
    const router = useRouter();
    const novelId = Number(params.id);

    const [novel, setNovel] = useState<Novel | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [editedTitle, setEditedTitle] = useState('');
    const [editedAuthor, setEditedAuthor] = useState('');
    const [editedDescription, setEditedDescription] = useState('');
    const [editedTags, setEditedTags] = useState('');
    const [editedStatus, setEditedStatus] = useState<'Ongoing' | 'Completed'>('Ongoing');
    const [editedCoverUrl, setEditedCoverUrl] = useState<string | null>(null);
    const [currentCoverUrl, setCurrentCoverUrl] = useState<string | null>(null);

    // Fetch novel data
    const loadNovelData = useCallback(async () => {
        if (isNaN(novelId) || authLoading) return;
        setLoading(true); setError(null);
        try {
            const data = await getNovel(novelId);
            if (!data) throw new Error('Novel not found.');
            setNovel(data);
            setEditedTitle(data.title);
            setEditedAuthor(data.author);
            setEditedDescription(data.description || '');
            setEditedTags(data.tags?.join(', ') || '');
            setEditedStatus(data.status);
            setCurrentCoverUrl(data.cover_url);
            setEditedCoverUrl(data.cover_url);
        } catch (err: any) {
            setError(err.message || 'Failed to load novel data.');
            toast.error(err.message || 'Failed to load novel data.');
        } finally {
            setLoading(false);
        }
    }, [novelId, authLoading]);

    useEffect(() => {
        loadNovelData();
    }, [loadNovelData]);

    // Handle Save
    const handleSave = async () => {
        if (!novel || !editedTitle.trim() || !editedAuthor.trim()) {
            toast.warning("Title and Author cannot be empty.");
            return;
        }
        setSaving(true); toast.info("Saving changes...");
        try {
            const updateData: Partial<Omit<Novel, 'id' | 'created_at' | 'updated_at' | 'rating' | 'author_id'>> = {
                title: editedTitle.trim(),
                author: editedAuthor.trim(),
                description: editedDescription.trim() || null,
                tags: editedTags.split(',').map(tag => tag.trim()).filter(tag => tag),
                status: editedStatus,
                cover_url: editedCoverUrl
            };

            const success = await updateNovelDetails(novel.id, updateData);

            if (success) {
                toast.success("Novel details saved successfully!");
                router.push(`/novels/${novel.id}`);
                router.refresh(); // Refresh cache after saving
            } else {
                throw new Error("Server failed to save changes.");
            }
        } catch (err: any) {
            console.error("Error saving novel:", err);
            toast.error(err.message || "Failed to save novel details.");
        } finally {
            setSaving(false);
        }
    };

    // Handle Cover Upload and Removal (logic remains the same)
    const handleCoverUploadComplete = (url: string) => {
        setEditedCoverUrl(url);
        setCurrentCoverUrl(url);
        toast.info("Cover image selected. Click 'Save Changes' to apply.");
    };
    const handleRemoveCover = () => {
        setEditedCoverUrl(null);
        setCurrentCoverUrl(null);
        toast.info("Cover image removed. Click 'Save Changes' to apply.");
    }

    // Loading/Error States (logic remains the same)
     if (loading || authLoading) {
        return ( <div className="min-h-screen bg-background flex items-center justify-center"> <LoadingSpinner size="lg" /> <span className="ml-2 text-muted-foreground">Loading editor...</span> </div> );
     }
     if (error) { return <NotFoundScreen message={error} returnUrl="/" returnText="Return to Home" />; }

    // Main Render
    return (
      <AdminRoleCheck allowAuthor={true}>
        <div className="min-h-screen bg-background text-foreground">
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-3xl mx-auto">
              {/* Back Link */}
              <div className="mb-6">
                <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
                  <Link href={`/novels/${novelId}`}> <ArrowLeft size={16} className="mr-1" /> Back to Novel View </Link>
                </Button>
              </div>

              {/* Edit Form Card */}
              <div className="bg-card text-card-foreground rounded-lg shadow-lg p-6">
                <h1 className="text-2xl font-bold mb-6 text-foreground"> Edit Novel Details </h1>
                <div className="space-y-6">
                  {/* Cover Section */}
                  <div>
                    <label className="block text-sm font-medium mb-2 text-foreground">Cover Image</label>
                    <div className="flex items-start gap-4">
                       <div className="relative w-32 aspect-[2/3] bg-muted rounded-md overflow-hidden border border-border">
                           {currentCoverUrl ? (
                              <>
                                 <Image src={currentCoverUrl} alt="Current cover" fill sizes="128px" className="object-cover"/>
                                 <Button variant="destructive" size="icon" onClick={handleRemoveCover} disabled={saving} className="absolute top-1 right-1 h-6 w-6 z-10" aria-label="Remove cover image"> <X size={14}/> </Button>
                              </>
                           ) : (
                              // Uses the imported BookOpen icon now
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground"> <BookOpen size={24}/> </div>
                           )}
                       </div>
                       <div className="flex-1">
                           <ImageUpload onUploadComplete={handleCoverUploadComplete} className="[&_input]:text-xs [&_input]:file:mr-2 [&_input]:file:px-2 [&_input]:file:py-1"/>
                           <p className="text-xs text-muted-foreground mt-2">Upload a new image (max 5MB). JPG, PNG, WEBP.</p>
                       </div>
                    </div>
                  </div>
                  {/* Title */}
                  <div> <label htmlFor="novel-title" className="block text-sm font-medium mb-1 text-foreground">Title</label> <Input id="novel-title" type="text" required value={editedTitle} onChange={e => setEditedTitle(e.target.value)} disabled={saving} /> </div>
                  {/* Author */}
                  <div> <label htmlFor="novel-author" className="block text-sm font-medium mb-1 text-foreground">Author</label> <Input id="novel-author" type="text" required value={editedAuthor} onChange={e => setEditedAuthor(e.target.value)} disabled={saving} /> </div>
                  {/* Description */}
                  <div> <label htmlFor="novel-description" className="block text-sm font-medium mb-1 text-foreground">Description</label> <Textarea id="novel-description" rows={5} value={editedDescription} onChange={e => setEditedDescription(e.target.value)} disabled={saving} /> </div>
                  {/* Tags */}
                  <div> <label htmlFor="novel-tags" className="block text-sm font-medium mb-1 text-foreground">Tags (comma separated)</label> <Input id="novel-tags" type="text" value={editedTags} onChange={e => setEditedTags(e.target.value)} placeholder="Fantasy, Action, Adventure" disabled={saving} /> </div>
                  {/* Status */}
                  <div> <label htmlFor="novel-status" className="block text-sm font-medium mb-1 text-foreground">Status</label> <select id="novel-status" value={editedStatus} onChange={e => setEditedStatus(e.target.value as 'Ongoing' | 'Completed')} disabled={saving} className="w-full px-3 py-2 h-9 rounded-md border bg-background border-input text-foreground text-sm focus:ring-1 focus:ring-ring"> <option value="Ongoing">Ongoing</option> <option value="Completed">Completed</option> </select> </div>
                  {/* Action Buttons */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-border"> <Button variant="ghost" onClick={() => router.push(`/novels/${novelId}`)} disabled={saving}> Cancel </Button> <Button onClick={handleSave} disabled={saving || !editedTitle.trim() || !editedAuthor.trim()}> {saving ? <LoadingSpinner className="mr-2" size="sm"/> : <Save size={16} className="mr-1" />} {saving ? 'Saving...' : 'Save Changes'} </Button> </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AdminRoleCheck>
    );
}