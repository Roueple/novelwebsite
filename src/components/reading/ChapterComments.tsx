// src/components/reading/ChapterComments.tsx
"use client";

import React, { useState, useEffect, useCallback, memo } from 'react';
import { useAuth } from '@/providers/auth-provider';
// Import DisplayComment from api.ts, and also Profile for pick if not already covered by DisplayComment
import { getChapterComments, addComment, deleteComment, type DisplayComment } from '@/lib/api';
import type { Profile } from '@/types'; // Profile is needed for Pick if DisplayComment doesn't export its Profile part
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { Send, Trash2, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// CommentItem Component
interface CommentItemProps {
  comment: DisplayComment; // Use DisplayComment which includes the 'profiles' field
  currentUser: ReturnType<typeof useAuth>['user'];
  currentUserRole: ReturnType<typeof useAuth>['role'];
  onDelete: (commentId: number) => Promise<void>;
  isDeleting: boolean;
}

const CommentItem = memo(({
  comment,
  currentUser,
  currentUserRole,
  onDelete,
  isDeleting
}: CommentItemProps) => {

  const getDisplayName = useCallback((c: DisplayComment): string => {
    if (c.profiles) {
      // Prioritize display_name, then username (unique handle)
      return c.profiles.display_name || c.profiles.username || 'User';
    }
    // This case should be rare now that all comments require a user_id
    // and getChapterComments joins profiles.
    return comment.user_id ? `User (${comment.user_id.substring(0,6)})` : 'Unknown User';
  }, [comment.user_id]); // Added comment.user_id to dependency for fallback

  const displayName = getDisplayName(comment);

  return (
    <div key={comment.id} className="flex space-x-3 bg-card p-3 rounded-lg border border-border/50">
      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-medium text-sm flex-shrink-0 mt-1">
        {displayName.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1 flex-wrap gap-x-2">
          <span className="font-medium text-sm text-foreground break-words">
            {displayName}
            {comment.profiles?.role === 'admin' && (
              <span className="ml-1 text-xs font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary">(Admin)</span>
            )}
          </span>
          <span className="text-xs text-muted-foreground flex-shrink-0" title={new Date(comment.created_at).toLocaleString()}>
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
          </span>
        </div>
        <p className="text-sm text-foreground whitespace-pre-wrap">{comment.content}</p>
        {(currentUser?.id === comment.user_id || currentUserRole === 'admin') && (
          <div className="mt-1 text-right">
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-1 py-0.5 text-xs text-destructive hover:bg-destructive/10"
              onClick={() => onDelete(comment.id)}
              disabled={isDeleting}
              aria-label="Delete comment"
            >
              {isDeleting ? <LoadingSpinner size="sm" className="mr-1"/> : <Trash2 size={14} className="mr-1"/>}
              Delete
            </Button>
          </div>
        )}
        {/* Pending Approval Tag - Only for admin view if getChapterComments fetches unapproved for admin,
            but typically getChapterComments fetches only approved ones.
            If this component is also used in an admin panel showing unapproved, this logic is fine.
            For reader view, approved comments won't show this.
        */}
        {currentUserRole === 'admin' && !comment.is_approved && (
          <span className="ml-2 text-xs font-semibold text-orange-500">(Pending Approval)</span>
        )}
      </div>
    </div>
  );
});
CommentItem.displayName = 'CommentItem';


// Main ChapterComments Component
interface ChapterCommentsProps {
  chapterId: number;
  novelId: number; // novelId might be useful for context or future features
}

const COMMENTS_PER_PAGE = 15;

const ChapterComments = memo(({ chapterId, novelId }: ChapterCommentsProps) => {
  // Removed isAnonymous and guestLoading from useAuth()
  const { user, role, loading: authLoading, profileLoading, profile } = useAuth();
  const [comments, setComments] = useState<DisplayComment[]>([]); // Use DisplayComment here
  const [loadingComments, setLoadingComments] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalComments, setTotalComments] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchComments = useCallback(async (page = 1, append = false) => {
    console.log(`[ChapterComments] Fetching comments page ${page} for chapter ${chapterId}`);
    if (!append) {
      setLoadingComments(true);
      // setComments([]); // Clearing here causes brief flash; let new data replace it.
      setCurrentPage(1); // Reset page when doing a fresh fetch
      setHasMore(true);    // Assume has more until fetch result says otherwise
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
  }, [chapterId]); // Only chapterId as dependency

  useEffect(() => {
    if (chapterId) { // Ensure chapterId is valid before fetching
        fetchComments(1, false);
    }
  }, [fetchComments, chapterId]); // Add chapterId here

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchComments(currentPage + 1, true);
    }
  };

  // No more handleCommentInteraction for anonymous sign-in

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) { // User must be logged in AND have a profile to comment
      toast.error("Please complete your profile or log in to comment.");
      // Here you might trigger a login modal or redirect to profile setup
      // For now, just an error.
      return;
    }
    if (!newComment.trim()) {
      toast.warning("Comment cannot be empty.");
      return;
    }
    // No guestLoading check needed

    setSubmitting(true);
    console.log(`[ChapterComments] Submitting comment for user: ${user.id}`);
    try {
      // addComment now takes userId directly
      const addedCommentData = await addComment(user.id, chapterId, newComment.trim());
      if (addedCommentData) {
        setNewComment('');
        // If admin, comment is auto-approved by trigger, so refetch to show immediately.
        // For readers, it goes to moderation.
        if (role === 'admin') {
            toast.success("Comment posted!");
            fetchComments(1, false); // Re-fetch to show admin's own auto-approved comment
        } else {
            toast.success("Comment submitted! It will appear after approval.");
        }
        console.log("[ChapterComments] Comment submission result:", addedCommentData);
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

  const handleDeleteComment = useCallback(async (commentId: number) => {
    if (!user) return; // Should not happen if delete button is shown only for logged-in users
    if (!confirm("Are you sure you want to delete this comment?")) return;
    setDeletingId(commentId);
    try {
      const success = await deleteComment(commentId);
      if (success) {
        toast.success("Comment deleted.");
        console.log(`[ChapterComments] Comment ${commentId} deleted.`);
        // Refetch comments to update the list
        setComments(prevComments => prevComments.filter(c => c.id !== commentId));
        setTotalComments(prevTotal => prevTotal > 0 ? prevTotal -1 : 0);

        // Alternative: refetch page 1 (might be simpler if pagination/order is complex)
        // fetchComments(1, false);
      } else {
        throw new Error("Failed to delete comment via API.");
      }
    } catch (err) {
      console.error("[ChapterComments] Error deleting comment:", err);
      toast.error("Failed to delete comment.");
    } finally {
      setDeletingId(null);
    }
  }, [user]); // Removed fetchComments from deps to avoid re-creating it often if fetchComments changes

  const getPlaceholderText = () => {
    if (authLoading || profileLoading) return "Loading user session...";
    if (!user) return "Please log in to comment...";
    if (!profile) return "Please complete your profile to comment..."; // User exists but no profile row yet
    return "Write your comment...";
  };

  // User can only comment if logged in AND profile exists (not null)
  const canComment = !!user && !!profile;

  return (
    <div className="mt-8 pt-6 border-t border-border">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-foreground">Comments ({totalComments})</h3>
        <Button variant="ghost" size="sm" onClick={() => fetchComments(1, false)} disabled={loadingComments || loadingMore} title="Refresh comments">
            <RefreshCw size={14} className={cn("mr-1", (loadingComments || loadingMore) && "animate-spin")} />
            Refresh
        </Button>
      </div>

      {/* Comment Submission Form */}
      {user && !profile && !authLoading && !profileLoading && (
        <div className="mb-6 p-3 bg-accent/50 border border-primary/20 rounded-md text-sm">
            <p className="text-accent-foreground">
                Welcome! Please <Link href="/profile/setup" className="font-semibold underline hover:text-primary">complete your profile</Link> (set a username and display name) to post comments.
            </p>
        </div>
      )}

      <form onSubmit={handleSubmitComment} className="mb-6">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={getPlaceholderText()}
          rows={3}
          className="mb-2 bg-input border-border text-foreground placeholder:text-muted-foreground"
          maxLength={1000}
          disabled={!canComment || authLoading || profileLoading || submitting}
          // Removed onFocus/onClick for auto-signin
        />
        <div className="flex justify-end items-center">
          <span className="text-xs text-muted-foreground mr-2">{newComment.length}/1000</span>
          <Button
            type="submit"
            disabled={!canComment || authLoading || profileLoading || submitting || !newComment.trim()}
            size="sm"
          >
            {submitting ? <LoadingSpinner size="sm" className="mr-1" /> : <Send size={16} className="mr-1" />}
            {submitting ? 'Posting...' : 'Post Comment'}
          </Button>
        </div>
      </form>

      {/* Display Comments */}
      {loadingComments && comments.length === 0 ? ( // Show main loader only if comments array is empty
        <div className="flex justify-center items-center py-8">
          <LoadingSpinner size="md" />
          <span className="ml-2 text-muted-foreground">Loading comments...</span>
        </div>
      ) : error ? (
        <p className="text-destructive text-center py-4">{error}</p>
      ) : comments.length === 0 && !loadingComments ? ( // No comments and not loading
        <p className="text-muted-foreground text-center text-sm py-4">No comments yet. Be the first!</p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUser={user}
              currentUserRole={role}
              onDelete={handleDeleteComment}
              isDeleting={deletingId === comment.id}
            />
          ))}
          {hasMore && !loadingMore && (
            <div className="text-center pt-4">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={loadingMore} // Should already be false here, but good practice
                className="text-primary border-primary hover:bg-primary/10"
              >
                <RefreshCw size={16} className="mr-2" />
                Load More Comments ({totalComments - comments.length} remaining)
              </Button>
            </div>
          )}
          {loadingMore && ( // Spinner for loading more
            <div className="flex justify-center items-center py-4">
              <LoadingSpinner size="md" />
              <span className="ml-2 text-muted-foreground">Loading more...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
ChapterComments.displayName = 'ChapterComments';

export default ChapterComments;