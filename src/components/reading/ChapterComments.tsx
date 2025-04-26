// src/components/reading/ChapterComments.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
// Import signInAnonymously instead of signInAsGuest
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

// generateAnonName might not be needed if profile stores it, but keep as fallback
const generateAnonName = () => {
    const num = Math.floor(1000 + Math.random() * 900000);
    return `anon#${num}`;
};

export default function ChapterComments({ chapterId, novelId }: ChapterCommentsProps) {
  // Get signInAnonymously and isAnonymous
  const { user, role, loading: authLoading, guestLoading, isAnonymous, signInAnonymously } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [anonSignInAttempted, setAnonSignInAttempted] = useState(false); // Track attempt

  useEffect(() => {
    console.log("[ChapterComments] User object:", user, "Is Anonymous:", isAnonymous);
    console.log("[ChapterComments] Auth loading:", authLoading, "Guest loading:", guestLoading);
  }, [user, authLoading, guestLoading, isAnonymous]);

  const fetchComments = useCallback(async () => {
    console.log(`[ChapterComments] Fetching comments for chapter ${chapterId}`);
    setLoadingComments(true);
    setError(null);
    try {
      const fetchedComments = await getChapterComments(chapterId);
      console.log(`[ChapterComments] Fetched ${fetchedComments.length} comments.`);
      setComments(fetchedComments);
    } catch (err) {
      console.error("[ChapterComments] Error fetching comments:", err);
      setError("Failed to load comments.");
      toast.error("Could not load comments.");
    } finally {
      setLoadingComments(false);
    }
  }, [chapterId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // --- Auto Anonymous Sign-In Logic ---
  const handleCommentInteraction = async () => {
      // Trigger only if not logged in, not loading, and haven't attempted
      if (!user && !authLoading && !guestLoading && !anonSignInAttempted) {
          console.log("[ChapterComments] User not logged in, attempting auto anonymous sign-in...");
          setAnonSignInAttempted(true); // Mark attempt
          try {
              await signInAnonymously(); // Call the renamed function
              // Success message handled in AuthProvider
          } catch (err) {
              // Error toast handled in AuthProvider
              setAnonSignInAttempted(false); // Allow retry on failure
          }
      }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
        toast.error("Please wait or click the text box again to comment anonymously.");
        return;
    }
     if (!newComment.trim()) {
        toast.warning("Comment cannot be empty.");
        return;
    }

    setSubmitting(true);
    console.log(`[ChapterComments] Submitting comment for user: ${user.id} (Is Anonymous: ${isAnonymous})`);
    try {
      const addedComment = await addComment(user.id, chapterId, newComment);
      if (addedComment) {
        setNewComment('');
        toast.success("Comment submitted successfully!");
        console.log("[ChapterComments] Comment submitted, awaiting approval:", addedComment);
        if (role === 'admin') fetchComments();
      } else {
        throw new Error("Failed to add comment via API.");
      }
    } catch (err) {
      console.error("[ChapterComments] Error submitting comment:", err);
      toast.error("Failed to post comment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!user) return;
    if (!confirm("Are you sure you want to delete this comment?")) return;
    setDeletingId(commentId);
    console.log(`[ChapterComments] Deleting comment ${commentId} by user: ${user.id}`);
    try {
      const success = await deleteComment(commentId);
      if (success) {
        setComments(prev => prev.filter(c => c.id !== commentId));
        toast.success("Comment deleted.");
        console.log(`[ChapterComments] Comment ${commentId} deleted.`);
      } else {
        throw new Error("Failed to delete comment via API.");
      }
    } catch (err) {
      console.error("[ChapterComments] Error deleting comment:", err);
      toast.error("Failed to delete comment.");
    } finally {
      setDeletingId(null);
    }
  };

  // Use isAnonymous flag from auth context primarily
  const getDisplayName = (comment: Comment): string => {
      // If profile exists and is_guest is explicitly true, use that username
      if (comment.profiles?.is_guest && comment.profiles.username) {
          return comment.profiles.username;
      }
      // If no profile or not marked as guest in profile, but user IS anonymous in auth state
      // (this case might occur briefly before profile syncs), generate name.
      // OR if profile exists but has no username (fallback)
      if (comment.user_id === user?.id && isAnonymous) {
           return comment.profiles?.username || `anon#${comment.user_id?.substring(0, 6) || '????'}`;
      }
      // Otherwise, use the registered username or fallback
      return comment.profiles?.username || 'Unknown User';
  };

  // Determine if the comment form should be enabled
  const isCommentFormEnabled = !authLoading && !guestLoading && !!user;
  const getPlaceholderText = () => {
      if (authLoading) return "Loading user...";
      if (guestLoading) return "Preparing anonymous comment...";
      if (!user) return "Click or type here to comment anonymously..."; // Updated placeholder
      return "Write your comment...";
  };

  return (
    <div className="mt-8 pt-6 border-t border-border">
      <h3 className="text-xl font-semibold mb-4 text-foreground">Comments</h3>

      {/* Comment Submission Form */}
      <form onSubmit={handleSubmitComment} className="mb-6">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={getPlaceholderText()}
          rows={3}
          className="mb-2 bg-input border-border text-foreground placeholder:text-muted-foreground"
          maxLength={1000}
          disabled={authLoading || guestLoading || submitting}
          onFocus={handleCommentInteraction}
          onClick={handleCommentInteraction}
        />
        <div className="flex justify-end items-center">
           <span className="text-xs text-muted-foreground mr-2">{newComment.length}/1000</span>
           <Button
             type="submit"
             disabled={!isCommentFormEnabled || submitting || !newComment.trim()}
             size="sm"
           >
             {(submitting || guestLoading) ? <LoadingSpinner size="sm" className="mr-1" /> : <Send size={16} className="mr-1" />}
             {submitting ? 'Posting...' : guestLoading ? 'Loading...' : 'Post Comment'}
           </Button>
        </div>
      </form>


      {/* Display Comments */}
      {loadingComments ? (
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
                {getDisplayName(comment).charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1 flex-wrap gap-x-2">
                  <span className="font-medium text-sm text-foreground break-words">
                    {getDisplayName(comment)}
                  </span>
                  <span className="text-xs text-muted-foreground flex-shrink-0" title={new Date(comment.created_at).toLocaleString()}>
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{comment.content}</p>
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
