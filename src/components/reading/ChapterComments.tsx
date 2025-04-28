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
import { Send, Trash2, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ChapterCommentsProps {
  chapterId: number;
  novelId: number;
}

const COMMENTS_PER_PAGE = 15;

export default function ChapterComments({ chapterId, novelId }: ChapterCommentsProps) {
  const { user, role, loading: authLoading, guestLoading, isAnonymous, signInAnonymously } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalComments, setTotalComments] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  // --- NEW: State to track if anonymous sign-in has been attempted ---
  const [hasAttemptedAnonSignIn, setHasAttemptedAnonSignIn] = useState(false);

  // FetchComments logic remains the same
  const fetchComments = useCallback(async (page = 1, append = false) => {
    console.log(`[ChapterComments] Fetching comments page ${page} for chapter ${chapterId}`);
    if (!append) {
      setLoadingComments(true);
      setComments([]);
      setCurrentPage(1);
      setHasMore(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);

    try {
      const result = await getChapterComments(chapterId, page, COMMENTS_PER_PAGE);
      if (result) {
        console.log(`[ChapterComments] Fetched ${result.comments.length} comments. Total: ${result.totalCount}`);
        setComments(prev => append ? [...prev, ...result.comments] : result.comments);
        setTotalComments(result.totalCount);
        setHasMore((page * COMMENTS_PER_PAGE) < result.totalCount);
        setCurrentPage(page);
      } else {
        throw new Error("API returned null while fetching comments.");
      }
    } catch (err) {
      console.error("[ChapterComments] Error fetching comments:", err);
      setError("Failed to load comments.");
      toast.error("Could not load comments.");
      setHasMore(false);
    } finally {
      setLoadingComments(false);
      setLoadingMore(false);
    }
  }, [chapterId]);

  // Initial fetch remains the same
  useEffect(() => {
    fetchComments(1, false);
  }, [fetchComments]);

  // handleLoadMore remains the same
  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchComments(currentPage + 1, true);
    }
  };

  // --- UPDATED: Auto Guest Sign-In Logic ---
  const handleCommentInteraction = async () => {
      // Trigger only if conditions are met AND sign-in hasn't been attempted yet
      if (!user && !authLoading && !guestLoading && !hasAttemptedAnonSignIn) {
          console.log("[ChapterComments] User not logged in, attempting ONE-TIME anonymous sign-in...");
          setHasAttemptedAnonSignIn(true); // Set flag immediately to prevent repeats
          const success = await signInAnonymously();
          if (!success) {
              console.error("[ChapterComments] Auto anonymous sign-in failed.");
              // Optionally reset the flag if sign-in fails, allowing another try later?
              // setHasAttemptedAnonSignIn(false);
          } else {
              console.log("[ChapterComments] Auto anonymous sign-in successful.");
          }
      }
  };

  // handleSubmitComment remains the same
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
        toast.error("Cannot comment: Please try interacting with the text box again.");
        return;
    }
     if (!newComment.trim()) {
        toast.warning("Comment cannot be empty.");
        return;
    }
    if (guestLoading) {
        toast.info("Please wait while guest session is prepared.");
        return;
    }

    setSubmitting(true);
    console.log(`[ChapterComments] Submitting comment for user: ${user.id} (Is Anonymous: ${isAnonymous})`);
    try {
      const addedComment = await addComment(user.id, chapterId, newComment);
      if (addedComment) {
        setNewComment('');
        toast.success("Comment submitted! It will appear after approval.");
        console.log("[ChapterComments] Comment submitted, awaiting approval:", addedComment);
        if (role === 'admin') {
            fetchComments(1, false);
        }
      } else {
        throw new Error("Failed to add comment: API returned unsuccessful.");
      }
    } catch (err: any) {
      console.error("[ChapterComments] Error submitting comment:", err);
      toast.error(`Failed to post comment: ${err.message || 'Please try again.'}`);
    } finally {
      setSubmitting(false);
    }
  };

  // handleDeleteComment remains the same
  const handleDeleteComment = async (commentId: number) => {
    if (!user) return;
    if (!confirm("Are you sure you want to delete this comment?")) return;
    setDeletingId(commentId);
    console.log(`[ChapterComments] Deleting comment ${commentId} by user: ${user.id}`);
    try {
      const success = await deleteComment(commentId);
      if (success) {
        toast.success("Comment deleted.");
        console.log(`[ChapterComments] Comment ${commentId} deleted.`);
        fetchComments(1, false); // Refetch page 1
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

  // getDisplayName remains the same
  const getDisplayName = (comment: Comment): string => {
      if (comment.profiles?.is_guest && comment.profiles.username) {
          return comment.profiles.username;
      }
      if (comment.user_id === user?.id && isAnonymous && comment.profiles?.is_guest) {
           return comment.profiles?.username || `anon#${comment.user_id?.substring(0, 6) || '????'}`;
      }
      return comment.profiles?.username || 'Unknown User';
  };

  // Comment Form State Logic remains the same
  const isCommentFormEnabled = !authLoading && !guestLoading && !!user;
  const getPlaceholderText = () => {
      if (authLoading) return "Loading user...";
      if (guestLoading) return "Preparing anonymous comment...";
      // Modify placeholder if sign-in was attempted but user is still null (e.g., sign-in failed)
      if (!user && hasAttemptedAnonSignIn) return "Guest sign-in failed. Please refresh or try logging in.";
      if (!user) return "Click or type here to comment anonymously...";
      return "Write your comment...";
  };

  // JSX structure remains largely the same
  return (
    <div className="mt-8 pt-6 border-t border-border">
      <h3 className="text-xl font-semibold mb-4 text-foreground">Comments ({totalComments})</h3>

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
          // Trigger the updated interaction handler
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
          {/* Map existing comments */}
          {comments.map((comment) => (
            <div key={comment.id} className="flex space-x-3 bg-card p-3 rounded-lg border border-border/50">
              {/* Avatar/Initial */}
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-bold text-sm flex-shrink-0 mt-1">
                 {getDisplayName(comment).charAt(0).toUpperCase()}
              </div>
              {/* Comment Content */}
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
                {/* Delete Button */}
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
                {/* Pending Approval Tag */}
                {role === 'admin' && !comment.is_approved && (
                    <span className="ml-2 text-xs font-semibold text-orange-500">(Pending Approval)</span>
                )}
              </div>
            </div>
          ))}

          {/* Load More Button */}
          {hasMore && !loadingMore && (
            <div className="text-center pt-4">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="text-primary border-primary hover:bg-primary/10"
              >
                <RefreshCw size={16} className="mr-2" />
                Load More Comments ({totalComments - comments.length} remaining)
              </Button>
            </div>
          )}
          {/* Loading More Spinner */}
          {loadingMore && (
            <div className="flex justify-center items-center py-4">
              <LoadingSpinner size="md" />
              <span className="ml-2 text-muted-foreground">Loading more...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}