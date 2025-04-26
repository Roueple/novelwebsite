// src/app/admin/comments/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/providers/auth-provider';
import AdminRoleCheck from '@/components/auth/admin-role-check';
import { getUnapprovedComments, approveComment, deleteComment } from '@/lib/api';
import type { Comment } from '@/types/supabase'; // Import base Comment type
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { Check, Trash2, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// Define the extended type locally for this component
type CommentWithContext = Comment & {
  chapters: { title: string, novel_id: number, novels: { title: string, id: number } | null } | null
};

export default function AdminCommentsPage() {
  const { user, role } = useAuth(); // Get user and role
  const [comments, setComments] = useState<CommentWithContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null); // Track which comment is being processed

  // Fetch unapproved comments
  const fetchUnapproved = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedComments = await getUnapprovedComments();
      setComments(fetchedComments);
    } catch (err) {
      console.error("Error fetching unapproved comments:", err);
      setError("Failed to load comments for moderation.");
      toast.error("Could not load comments.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetch only if the user is confirmed to be an admin
    if (role === 'admin') {
        fetchUnapproved();
    } else if (role !== null) { // If role is loaded but not admin
        setError("Access Denied.");
        setLoading(false);
    }
    // If role is null, AdminRoleCheck handles loading/redirect
  }, [role, fetchUnapproved]);

  // Handle Approve
  const handleApprove = async (commentId: number) => {
    setProcessingId(commentId);
    try {
      const success = await approveComment(commentId);
      if (success) {
        setComments(prev => prev.filter(c => c.id !== commentId)); // Remove from list
        toast.success("Comment approved!");
      } else {
        throw new Error("Failed to approve comment via API.");
      }
    } catch (err) {
      console.error("Error approving comment:", err);
      toast.error("Failed to approve comment.");
    } finally {
      setProcessingId(null);
    }
  };

  // Handle Delete
  const handleDelete = async (commentId: number) => {
    if (!confirm("Are you sure you want to permanently delete this comment?")) return;
    setProcessingId(commentId);
    try {
      const success = await deleteComment(commentId); // Uses the existing delete API
      if (success) {
        setComments(prev => prev.filter(c => c.id !== commentId)); // Remove from list
        toast.success("Comment deleted.");
      } else {
        throw new Error("Failed to delete comment via API.");
      }
    } catch (err) {
      console.error("Error deleting comment:", err);
      toast.error("Failed to delete comment.");
    } finally {
      setProcessingId(null);
    }
  };

  // Helper to display username or generated guest name
  const getDisplayName = (comment: CommentWithContext): string => {
      if (comment.profiles?.is_guest) {
          return comment.profiles?.username || `anon#${comment.user_id?.substring(0, 6) || '????'}`; // Generate guest name
      }
      return comment.profiles?.username || 'Unknown User';
  };

  return (
    <AdminRoleCheck> {/* Ensures only admins can access this */}
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 text-foreground">Comment Moderation</h1>
        <p className="text-muted-foreground mb-6">Review and approve or delete pending comments.</p>

        {loading ? (
          <div className="flex justify-center items-center py-16">
            <LoadingSpinner size="lg" />
            <span className="ml-3 text-muted-foreground">Loading pending comments...</span>
          </div>
        ) : error ? (
          <p className="text-destructive text-center py-16">{error}</p>
        ) : comments.length === 0 ? (
          <p className="text-muted-foreground text-center py-16">No comments are currently pending approval.</p>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="bg-card p-4 rounded-lg border border-border shadow-sm">
                <div className="flex justify-between items-start mb-2 gap-4">
                  <div>
                      <span className="font-medium text-sm text-foreground">
                          {getDisplayName(comment)}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2" title={new Date(comment.created_at).toLocaleString()}>
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                      {comment.chapters?.novels && comment.chapters.novel_id && (
                         <Link
                            href={`/novels/${comment.chapters.novel_id}/chapter/${comment.chapter_id}`} // Use chapter_id from comment directly
                            target="_blank" // Open in new tab
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline ml-3 inline-flex items-center gap-1"
                            title={`Go to ${comment.chapters.novels.title} - Chapter ${comment.chapters.title}`}
                         >
                            on "{comment.chapters.novels.title}" - Ch. "{comment.chapters.title}"
                            <ExternalLink size={12} />
                         </Link>
                      )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive border-destructive hover:bg-destructive/10 h-8 px-2"
                      onClick={() => handleDelete(comment.id)}
                      disabled={processingId === comment.id}
                      aria-label="Delete comment"
                    >
                      {processingId === comment.id ? <LoadingSpinner size="sm" /> : <Trash2 size={16} />}
                      <span className="hidden sm:inline ml-1">Delete</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-green-600 border-green-600 hover:bg-green-500/10 h-8 px-2"
                      onClick={() => handleApprove(comment.id)}
                      disabled={processingId === comment.id}
                      aria-label="Approve comment"
                    >
                      {processingId === comment.id ? <LoadingSpinner size="sm" /> : <Check size={16} />}
                       <span className="hidden sm:inline ml-1">Approve</span>
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap bg-muted/30 p-2 rounded border border-border/30">
                    {comment.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminRoleCheck>
  );
}

