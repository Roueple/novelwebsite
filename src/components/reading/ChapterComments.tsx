// src/components/reading/ChapterComments.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/providers/auth-provider'; // [cite: 1445]
import { getChapterComments, addComment, deleteComment } from '@/lib/api'; // [cite: 1446]
import type { Comment } from '@/types/supabase'; // [cite: 1446]
import { Textarea } from '@/components/ui/textarea'; // [cite: 1446]
import { Button } from '@/components/ui/button'; // [cite: 1447]
import { toast } from 'sonner'; // [cite: 1447]
import LoadingSpinner from '@/components/ui/loading-spinner'; // [cite: 1447]
import { Send, Trash2, RefreshCw } from 'lucide-react'; // Added RefreshCw for Load More
import { formatDistanceToNow } from 'date-fns'; // [cite: 1448]

interface ChapterCommentsProps {
  chapterId: number;
  novelId: number;
}

const COMMENTS_PER_PAGE = 15; // Define how many comments to load per page

export default function ChapterComments({ chapterId, novelId }: ChapterCommentsProps) {
  const { user, role, loading: authLoading, guestLoading, isAnonymous, signInAnonymously } = useAuth(); // [cite: 1450]
  const [comments, setComments] = useState<Comment[]>([]); // [cite: 1450]
  const [loadingComments, setLoadingComments] = useState(true); // Initial load state
  const [loadingMore, setLoadingMore] = useState(false); // State for loading subsequent pages
  const [error, setError] = useState<string | null>(null); // [cite: 1451]
  const [newComment, setNewComment] = useState(''); // [cite: 1451]
  const [submitting, setSubmitting] = useState(false); // [cite: 1451]
  const [deletingId, setDeletingId] = useState<number | null>(null); // [cite: 1452]
  const [currentPage, setCurrentPage] = useState(1);
  const [totalComments, setTotalComments] = useState(0);
  const [hasMore, setHasMore] = useState(true); // Assume there are more comments initially

  // Modified fetchComments to handle pagination
  const fetchComments = useCallback(async (page = 1, append = false) => {
    console.log(`[ChapterComments] Fetching comments page ${page} for chapter ${chapterId}`);
    // Set appropriate loading state based on whether it's initial load or loading more
    if (!append) {
      setLoadingComments(true);
      setComments([]); // Reset comments for initial load
      setCurrentPage(1); // Reset page for initial load
      setHasMore(true); // Reset hasMore for initial load
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
        // Determine if there are more pages
        setHasMore((page * COMMENTS_PER_PAGE) < result.totalCount);
        setCurrentPage(page);
      } else {
        throw new Error("API returned null while fetching comments.");
      }
    } catch (err) {
      console.error("[ChapterComments] Error fetching comments:", err);
      setError("Failed to load comments.");
      toast.error("Could not load comments.");
      setHasMore(false); // Assume no more on error
    } finally {
      setLoadingComments(false);
      setLoadingMore(false);
    }
  }, [chapterId]);

  // Initial fetch
  useEffect(() => {
    fetchComments(1, false); // Fetch first page initially
  }, [fetchComments]);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchComments(currentPage + 1, true); // Fetch next page and append
    }
  };


  // Auto Guest Sign-In Logic (Keep as is)
  const handleCommentInteraction = async () => {
      if (!user && !authLoading && !guestLoading) { // [cite: 1456]
          console.log("[ChapterComments] User not logged in, attempting auto anonymous sign-in..."); // [cite: 1456]
          const success = await signInAnonymously(); // [cite: 1457]
          if (!success) { // [cite: 1457]
              console.error("[ChapterComments] Auto anonymous sign-in failed."); // [cite: 1458]
          } else {
              console.log("[ChapterComments] Auto anonymous sign-in successful."); // [cite: 1459]
          }
      }
  }; // [cite: 1460]

  // Submit Comment Logic (Keep as is, but maybe refresh comments list if user is admin)
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault(); // [cite: 1461]
    if (!user) { // [cite: 1462]
        toast.error("Cannot comment: Please try interacting with the text box again."); // [cite: 1462]
        return; // [cite: 1462]
    }
     if (!newComment.trim()) { // [cite: 1463]
        toast.warning("Comment cannot be empty."); // [cite: 1463]
        return; // [cite: 1463]
    }
    if (guestLoading) { // [cite: 1464]
        toast.info("Please wait while guest session is prepared."); // [cite: 1464]
        return; // [cite: 1464]
    }

    setSubmitting(true); // [cite: 1465]
    console.log(`[ChapterComments] Submitting comment for user: ${user.id} (Is Anonymous: ${isAnonymous})`); // [cite: 1465]
    try {
      const addedComment = await addComment(user.id, chapterId, newComment); // [cite: 1466]
      if (addedComment) { // [cite: 1466]
        setNewComment(''); // [cite: 1467]
        toast.success("Comment submitted! It will appear after approval."); // Updated message
        console.log("[ChapterComments] Comment submitted, awaiting approval:", addedComment); // [cite: 1467]
        // Optionally, refresh the first page if the user is admin to see the pending comment
        if (role === 'admin') {
            fetchComments(1, false);
        }
      } else {
        throw new Error("Failed to add comment: API returned unsuccessful."); // [cite: 1468]
      }
    } catch (err: any) { // [cite: 1469]
      console.error("[ChapterComments] Error submitting comment:", err); // [cite: 1469]
      toast.error(`Failed to post comment: ${err.message || 'Please try again.'}`); // [cite: 1469]
    } finally {
      setSubmitting(false); // [cite: 1470]
    }
  };

  // Delete Comment Logic (Keep as is, but maybe refresh comments list)
  const handleDeleteComment = async (commentId: number) => {
    if (!user) return; // [cite: 1471]
    if (!confirm("Are you sure you want to delete this comment?")) return; // [cite: 1471]
    setDeletingId(commentId); // [cite: 1472]
    console.log(`[ChapterComments] Deleting comment ${commentId} by user: ${user.id}`); // [cite: 1472]
    try {
      const success = await deleteComment(commentId); // [cite: 1473]
      if (success) { // [cite: 1473]
        // Instead of just filtering, refetch the current view to maintain pagination integrity
        // Or optimistically remove and adjust count (more complex)
        // Simple approach: Refetch the first page after deletion
        toast.success("Comment deleted."); // [cite: 1474]
        console.log(`[ChapterComments] Comment ${commentId} deleted.`); // [cite: 1474]
        fetchComments(1, false); // Refetch page 1
      } else {
        throw new Error("Failed to delete comment via API."); // [cite: 1475]
      }
    } catch (err) {
      console.error("[ChapterComments] Error deleting comment:", err); // [cite: 1476]
      toast.error("Failed to delete comment."); // [cite: 1476]
    } finally {
      setDeletingId(null); // [cite: 1477]
    }
  };

  // getDisplayName Logic (Keep as is)
  const getDisplayName = (comment: Comment): string => {
      if (comment.profiles?.is_guest && comment.profiles.username) {
          return comment.profiles.username; // [cite: 1478]
      }
      // Check if the current viewing user is the anonymous author of this comment
      if (comment.user_id === user?.id && isAnonymous && comment.profiles?.is_guest) {
           return comment.profiles?.username || `anon#${comment.user_id?.substring(0, 6) || '????'}`; // Show their anon name
      }
      // Otherwise show registered username or generic fallback
      return comment.profiles?.username || 'Unknown User'; // [cite: 1480]
  };

  // Comment Form State Logic (Keep as is)
  const isCommentFormEnabled = !authLoading && !guestLoading && !!user; // [cite: 1481]
  const getPlaceholderText = () => {
      if (authLoading) return "Loading user..."; // [cite: 1482]
      if (guestLoading) return "Preparing anonymous comment..."; // [cite: 1482]
      if (!user) return "Click or type here to comment anonymously..."; // [cite: 1482]
      return "Write your comment..."; // [cite: 1483]
  };

  return (
    <div className="mt-8 pt-6 border-t border-border">
      <h3 className="text-xl font-semibold mb-4 text-foreground">Comments ({totalComments})</h3>

      {/* Comment Submission Form (Keep as is) */}
      <form onSubmit={handleSubmitComment} className="mb-6">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={getPlaceholderText()}
          rows={3}
          className="mb-2 bg-input border-border text-foreground placeholder:text-muted-foreground" // [cite: 1484]
          maxLength={1000}
          disabled={authLoading || guestLoading || submitting}
          onFocus={handleCommentInteraction}
          onClick={handleCommentInteraction} // [cite: 1484]
        />
        <div className="flex justify-end items-center">
           <span className="text-xs text-muted-foreground mr-2">{newComment.length}/1000</span>
           <Button
             type="submit" // [cite: 1485]
             disabled={!isCommentFormEnabled || submitting || !newComment.trim()} // [cite: 1485]
             size="sm" // [cite: 1485]
           >
             {(submitting || guestLoading) ? <LoadingSpinner size="sm" className="mr-1" /> : <Send size={16} className="mr-1" />} {/* [cite: 1486] */}
             {submitting ? 'Posting...' : guestLoading ? 'Loading...' : 'Post Comment'} {/* [cite: 1487] */}
           </Button>
        </div>
      </form>

      {/* Display Comments */}
      {loadingComments ? (
         <div className="flex justify-center items-center py-8">
           <LoadingSpinner size="md" />
           <span className="ml-2 text-muted-foreground">Loading comments...</span>
         </div> // [cite: 1488]
      ) : error ? (
         <p className="text-destructive text-center">{error}</p> // [cite: 1489]
      ) : comments.length === 0 ? (
         <p className="text-muted-foreground text-center text-sm py-4">No comments yet. Be the first!</p> // [cite: 1490]
      ) : (
        <div className="space-y-4">
          {/* Map existing comments (Keep as is) */}
          {comments.map((comment) => (
            <div key={comment.id} className="flex space-x-3 bg-card p-3 rounded-lg border border-border/50">
              {/* Avatar/Initial */}
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-bold text-sm flex-shrink-0 mt-1">
                 {getDisplayName(comment).charAt(0).toUpperCase()} {/* [cite: 1491] */}
              </div>
              {/* Comment Content */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1 flex-wrap gap-x-2">
                  <span className="font-medium text-sm text-foreground break-words">
                    {getDisplayName(comment)} {/* [cite: 1492] */}
                  </span>
                  <span className="text-xs text-muted-foreground flex-shrink-0" title={new Date(comment.created_at).toLocaleString()}>
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })} {/* [cite: 1493] */}
                  </span>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{comment.content}</p> {/* [cite: 1493] */}
                {/* Delete Button (Keep as is) */}
                {(user?.id === comment.user_id || role === 'admin') && ( // [cite: 1494]
                    <div className="mt-1 text-right">
                        <Button
                            variant="ghost" // [cite: 1495]
                            size="sm" // [cite: 1495]
                            className="h-auto px-1 py-0.5 text-xs text-destructive hover:bg-destructive/10" // [cite: 1495]
                            onClick={() => handleDeleteComment(comment.id)} // [cite: 1495]
                            disabled={deletingId === comment.id} // [cite: 1496]
                            aria-label="Delete comment" // [cite: 1496]
                        >
                            {deletingId === comment.id ? ( // [cite: 1497]
                                 <LoadingSpinner size="sm" className="mr-1"/> // [cite: 1497]
                            ) : (
                                <Trash2 size={14} className="mr-1"/> // [cite: 1498]
                            )}
                            Delete
                        </Button>
                    </div>
                )}
                {/* Pending Approval Tag (Keep as is) */}
                {role === 'admin' && !comment.is_approved && ( // [cite: 1499]
                    <span className="ml-2 text-xs font-semibold text-orange-500">(Pending Approval)</span> // [cite: 1499]
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