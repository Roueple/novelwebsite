// src/components/reading/ChapterComments.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { getChapterComments, addComment, deleteComment } from '@/lib/api';
import type { Comment } from '@/types/supabase';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { Send, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ChapterCommentsProps {
  chapterId: number;
  novelId: number;
}

// Helper function to generate random anon name
const generateAnonName = () => {
    const num = Math.floor(1000 + Math.random() * 900000); // 4 to 6 digits
    return `anon#${num}`;
};

export default function ChapterComments({ chapterId, novelId }: ChapterCommentsProps) {
  const { user, role } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Fetch comments (RLS handles filtering approved ones for non-admins)
  const fetchComments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedComments = await getChapterComments(chapterId);
      setComments(fetchedComments);
    } catch (err) {
      console.error("Error fetching comments:", err);
      setError("Failed to load comments.");
      toast.error("Could not load comments.");
    } finally {
      setLoading(false);
    }
  }, [chapterId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Handle comment submission (works for logged-in and guest users)
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) {
        // Allow guests - user object exists for guests too
        if (!newComment.trim()) {
             toast.warning("Comment cannot be empty.");
             return;
        }
        if (!user) {
            toast.error("An authentication error occurred. Please refresh.");
            return
        }
    }


    setSubmitting(true);
    try {
      // Pass the user ID (even for guests)
      const addedComment = await addComment(user.id, chapterId, newComment);

      if (addedComment) {
        // Don't add to list immediately as it needs approval
        // setComments(prev => [...prev, addedComment]); // REMOVED optimistic update

        setNewComment('');
        // Give generic success message - DON'T mention review
        toast.success("Comment submitted successfully!");
      } else {
        throw new Error("Failed to add comment via API.");
      }
    } catch (err) {
      console.error("Error submitting comment:", err);
      toast.error("Failed to post comment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle comment deletion (remains the same, relies on RLS)
  const handleDeleteComment = async (commentId: number) => {
    if (!user) return;
    if (!confirm("Are you sure you want to delete this comment?")) return;
    setDeletingId(commentId);
    try {
      const success = await deleteComment(commentId);
      if (success) {
        setComments(prev => prev.filter(c => c.id !== commentId));
        toast.success("Comment deleted.");
      } else {
        throw new Error("Failed to delete comment via API.");
      }
    } catch (err) {
      console.error("Error deleting comment:", err);
      toast.error("Failed to delete comment.");
    } finally {
      setDeletingId(null);
    }
  };

  // Helper to display username or generated guest name
  const getDisplayName = (comment: Comment): string => {
      if (comment.profiles?.is_guest) {
          // Generate a consistent guest name based on user_id if needed,
          // or use the profile username which might already be the anon# format.
          // For simplicity, let's assume the profile username for guests IS the anon format.
          return comment.profiles?.username || generateAnonName(); // Fallback just in case
      }
      return comment.profiles?.username || 'Unknown User';
  };

  return (
    <div className="mt-8 pt-6 border-t border-border">
      <h3 className="text-xl font-semibold mb-4 text-foreground">Comments</h3>

      {/* Comment Submission Form (Now available to guests too if user object exists) */}
      {user ? (
        <form onSubmit={handleSubmitComment} className="mb-6">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write your comment..."
            rows={3}
            className="mb-2 bg-input border-border text-foreground placeholder:text-muted-foreground"
            maxLength={1000}
            disabled={submitting}
          />
          <div className="flex justify-end items-center">
             <span className="text-xs text-muted-foreground mr-2">{newComment.length}/1000</span>
             <Button type="submit" disabled={submitting || !newComment.trim()} size="sm">
               {submitting ? <LoadingSpinner size="sm" className="mr-1" /> : <Send size={16} className="mr-1" />}
               {submitting ? 'Posting...' : 'Post Comment'}
             </Button>
          </div>
        </form>
      ) : (
         // Show login prompt if truly no user (not even guest)
        <p className="text-muted-foreground text-sm mb-6">
          Please log in or continue as guest to post comments.
        </p>
      )}

      {/* Display Comments (Only approved comments shown to non-admins via RLS) */}
      {loading ? (
        <div className="flex justify-center items-center py-8">
          <LoadingSpinner size="md" />
          <span className="ml-2 text-muted-foreground">Loading comments...</span>
        </div>
      ) : error ? (
        <p className="text-destructive text-center">{error}</p>
      ) : comments.length === 0 ? (
        <p className="text-muted-foreground text-center text-sm py-4">No comments yet. Be the first!</p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="flex space-x-3 bg-card p-3 rounded-lg border border-border/50">
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-bold text-sm flex-shrink-0 mt-1">
                {/* Display first letter of generated name for guests */}
                {getDisplayName(comment).charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm text-foreground">
                    {getDisplayName(comment)} {/* Use helper function */}
                  </span>
                  <span className="text-xs text-muted-foreground" title={new Date(comment.created_at).toLocaleString()}>
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{comment.content}</p>
                {/* Delete Button - Show only for comment owner or admin */}
                {/* RLS handles whether the comment is visible for deletion check */}
                {(user?.id === comment.user_id || role === 'admin') && (
                    <div className="mt-1 text-right">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto px-1 py-0.5 text-xs text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteComment(comment.id)}
                            disabled={deletingId === comment.id}
                            aria-label="Delete comment"
                        >
                            {deletingId === comment.id ? (
                                <LoadingSpinner size="sm" className="mr-1"/>
                            ) : (
                                <Trash2 size={14} className="mr-1"/>
                            )}
                            Delete
                        </Button>
                    </div>
                )}
                {/* Optional: Show 'Pending Approval' badge for Admins */}
                {role === 'admin' && !comment.is_approved && (
                    <span className="ml-2 text-xs font-semibold text-orange-500">(Pending Approval)</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
