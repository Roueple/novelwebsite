// src/components/reading/ChapterComments.tsx
"use client";

import React, { useState, useEffect, useCallback, memo, useRef } from 'react';
import { useAuth } from '@/providers/auth-provider'; // Ensure signInWithOtp is exposed if not already
import { getChapterComments, addComment, deleteComment, type DisplayComment } from '@/lib/api';
import type { Profile } from '@/types';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { Send, Trash2, RefreshCw, MessageSquare, UserPlus, Mail } from 'lucide-react'; // Added Mail
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// CommentItem Component (remains the same - no changes needed here)
// ... (Keep your existing CommentItem component)
interface CommentItemProps {
  comment: DisplayComment;
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
      return c.profiles.display_name || c.profiles.username || 'User';
    }
    return comment.user_id ? `User (${comment.user_id.substring(0,6)})` : 'Unknown User';
  }, [comment.user_id, comment.profiles]);

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
  novelId: number;
}

const PENDING_COMMENT_STORAGE_KEY = 'pendingCommentData';
const COMMENTS_PER_PAGE = 15;

const ChapterComments = memo(({ chapterId, novelId }: ChapterCommentsProps) => {
  // Ensure signInWithOtp is available from useAuth, add if not.
  // For this example, I'll assume it's available as `signInWithEmailOtp`
  const { user, role, loading: authLoading, profileLoading, profile, signInWithEmail: signInWithEmailOtp } = useAuth();
  
  const [comments, setComments] = useState<DisplayComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for the comment form
  const [commentText, setCommentText] = useState('');

  // State specific to guest OTP signup flow
  const [guestEmail, setGuestEmail] = useState('');
  const [guestDisplayName, setGuestDisplayName] = useState('');
  const [isGuestSubmitting, setIsGuestSubmitting] = useState(false); // For OTP initiation

  const [currentPage, setCurrentPage] = useState(1);
  const [totalComments, setTotalComments] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchComments = useCallback(async (page = 1, append = false) => {
    setLoadingComments(true);
    if (!append) { setCurrentPage(1); setHasMore(true); }
    else { setLoadingMore(true); }
    setError(null);
    try {
      const result = await getChapterComments(chapterId, page, COMMENTS_PER_PAGE);
      if (result) {
        setComments(prev => append ? [...prev, ...result.comments] : result.comments);
        setTotalComments(result.totalCount);
        setHasMore((page * COMMENTS_PER_PAGE) < result.totalCount);
        setCurrentPage(page);
      } else { throw new Error("API returned null for comments."); }
    } catch (err: any) {
      setError(err.message || "Failed to load comments.");
      toast.error(err.message || "Could not load comments.");
      setHasMore(false);
    } finally { setLoadingComments(false); setLoadingMore(false); }
  }, [chapterId]);

  useEffect(() => {
    if (chapterId) {
      fetchComments(1, false);
    }
  }, [fetchComments, chapterId]);

  // Attempt to load staged data if user just logged in (e.g., after OTP verification)
  // This effect will run when `user` object changes (e.g., after login)
  useEffect(() => {
    if (user && !profileLoading && !authLoading) { // User is now logged in
      const pendingData = localStorage.getItem(PENDING_COMMENT_STORAGE_KEY);
      if (pendingData) {
        try {
          const { email: storedEmail, displayName: storedDisplayName, text, storedChapterId, storedNovelId } = JSON.parse(pendingData);
          // Check if this pending data is for the current user and chapter
          if (user.email === storedEmail && chapterId === storedChapterId) {
            setCommentText(text); // Pre-fill comment text
            // Display name is handled during profile creation in /auth/callback
            // localStorage.removeItem(PENDING_COMMENT_STORAGE_KEY); // Cleared in /auth/callback
            toast.info("You can now post your comment.", { duration: 5000 });
          } else {
            // Stored data is for a different user/context, clear it
            localStorage.removeItem(PENDING_COMMENT_STORAGE_KEY);
          }
        } catch (e) {
          console.error("Error parsing pending comment data:", e);
          localStorage.removeItem(PENDING_COMMENT_STORAGE_KEY);
        }
      }
    }
  }, [user, profileLoading, authLoading, chapterId]);


  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchComments(currentPage + 1, true);
    }
  };

  const handleGuestCommentAndOtpSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestEmail.trim() || !guestDisplayName.trim() || !commentText.trim()) {
      toast.warning("Please fill in your email, display name, and comment.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim())) {
        toast.error("Please enter a valid email address.");
        return;
    }

    setIsGuestSubmitting(true);
    toast.info("Sending verification link to your email...");

    try {
      // Store display name and comment text for retrieval after OTP verification
      const pendingCommentData = {
        email: guestEmail.trim(),
        displayName: guestDisplayName.trim(),
        text: commentText.trim(),
        chapterId: chapterId,
        novelId: novelId,
        timestamp: Date.now(), // For potential expiry logic later
      };
      localStorage.setItem(PENDING_COMMENT_STORAGE_KEY, JSON.stringify(pendingCommentData));

      // Initiate OTP (magic link) flow.
      // Ensure your AuthProvider's signInWithEmailOtp correctly calls supabase.auth.signInWithOtp
      await signInWithEmailOtp(guestEmail.trim()); // This function should handle options like emailRedirectTo

      // UI will show "Check your email..."
      // The actual account & profile creation, and comment submission will happen in /auth/callback
      // after the user clicks the link in their email.
      setGuestEmail(''); // Clear fields after starting the process
      setGuestDisplayName('');
      setCommentText('');
      toast.success("Verification link sent! Please check your email to continue.", { duration: 10000 });

    } catch (error: any) {
      console.error("Guest OTP signup initiation error:", error);
      toast.error(`Error: ${error.message || "Could not send verification email."}`);
      localStorage.removeItem(PENDING_COMMENT_STORAGE_KEY); // Clean up if OTP send failed
    } finally {
      setIsGuestSubmitting(false);
    }
  };

  const handleRegisteredUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) {
      toast.error("You must be logged in with a complete profile.");
      return;
    }
    if (!commentText.trim()) {
      toast.warning("Comment cannot be empty.");
      return;
    }

    setIsGuestSubmitting(true); // Use same loading state for simplicity
    try {
      const addedCommentData = await addComment(user.id, chapterId, commentText.trim());
      if (addedCommentData) {
        setCommentText('');
        toast.success(role === 'admin' ? "Comment posted!" : "Comment submitted for approval!");
        fetchComments(1, false);
      } else {
        throw new Error("Failed to add comment via API.");
      }
    } catch (err: any) {
      console.error("Registered user comment submission error:", err);
      toast.error(`Failed to post comment: ${err.message}`);
    } finally {
      setIsGuestSubmitting(false);
    }
  };

  const handleDeleteComment = useCallback(async (commentId: number) => {
    // ... (same as your existing)
    if (!user) return;
    if (!confirm("Are you sure you want to delete this comment?")) return;
    setDeletingId(commentId);
    try {
      const success = await deleteComment(commentId);
      if (success) {
        toast.success("Comment deleted.");
        setComments(prevComments => prevComments.filter(c => c.id !== commentId));
        setTotalComments(prevTotal => prevTotal > 0 ? prevTotal -1 : 0);
      } else {
        throw new Error("Failed to delete comment via API.");
      }
    } catch (err) {
      console.error("[ChapterComments] Error deleting comment:", err);
      toast.error("Failed to delete comment.");
    } finally {
      setDeletingId(null);
    }
  }, [user]);


  if (authLoading) { // Simplified initial loading check
    return (
      <div className="mt-8 pt-6 border-t border-border flex flex-col items-center">
        <LoadingSpinner />
        <p className="text-muted-foreground mt-2">Loading comments section...</p>
      </div>
    );
  }

  return (
    <div className="mt-8 pt-6 border-t border-border">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-foreground">Comments ({totalComments})</h3>
        <Button variant="ghost" size="sm" onClick={() => fetchComments(1, false)} disabled={loadingComments || loadingMore || isGuestSubmitting} title="Refresh comments">
            <RefreshCw size={14} className={cn("mr-1", (loadingComments || loadingMore) && "animate-spin")} />
            Refresh
        </Button>
      </div>

      {/* Comment Submission Area */}
      <div className="mb-6">
        {!user ? (
          // Guest commenting form with OTP signup
          <form onSubmit={handleGuestCommentAndOtpSignup} className="p-4 bg-card border border-border rounded-lg space-y-3">
            <div className="flex items-center gap-2 text-sm text-primary">
              <Mail size={18} />
              <span>Post Comment & Sign Up/Login with Email Link</span>
            </div>
            <div>
              <label htmlFor="guestEmail" className="block text-xs font-medium text-muted-foreground mb-1">Your Email</label>
              <Input
                id="guestEmail"
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="bg-input border-input"
                disabled={isGuestSubmitting}
              />
            </div>
            <div>
              <label htmlFor="guestDisplayName" className="block text-xs font-medium text-muted-foreground mb-1">Display Name (Public)</label>
              <Input
                id="guestDisplayName"
                type="text"
                value={guestDisplayName}
                onChange={(e) => setGuestDisplayName(e.target.value)}
                placeholder="Your public name"
                required
                className="bg-input border-input"
                disabled={isGuestSubmitting}
              />
            </div>
            <div>
              <label htmlFor="guestCommentText" className="block text-xs font-medium text-muted-foreground mb-1">Your Comment</label>
              <Textarea
                id="guestCommentText"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Share your thoughts..."
                rows={3}
                className="bg-input border-input placeholder:text-muted-foreground/70"
                maxLength={1000}
                required
                disabled={isGuestSubmitting}
              />
              <p className="text-xs text-muted-foreground mt-1">{commentText.length}/1000</p>
            </div>
            <Button type="submit" disabled={isGuestSubmitting || !guestEmail.trim() || !guestDisplayName.trim() || !commentText.trim()} className="w-full sm:w-auto">
              {isGuestSubmitting ? <LoadingSpinner size="sm" className="mr-1" /> : <Send size={16} className="mr-1" />}
              {isGuestSubmitting ? 'Processing...' : 'Post & Get Login Link'}
            </Button>
             <p className="text-xs text-muted-foreground">
                We'll send a login link to your email. Clicking it will log you in, create your account (if new), and then your comment will be submitted for approval.
            </p>
          </form>
        ) : !profile && !profileLoading ? ( // User logged in, but profile needs completion
          <div className="p-4 bg-card border border-border rounded-md text-center">
            <MessageSquare className="mx-auto mb-2 text-muted-foreground" size={28}/>
            <p className="text-accent-foreground">
                Almost there! Please <Link href="/profile/setup" className="font-semibold underline hover:text-primary">complete your profile</Link> to post comments.
            </p>
            <p className="text-xs text-muted-foreground mt-2">(Your unique username will be auto-generated based on your display name).</p>
          </div>
        ) : profile ? ( // Logged-in user with profile - standard comment form
          <form onSubmit={handleRegisteredUserSubmit}>
            <Textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Share your thoughts on this chapter..."
              rows={3}
              className="mb-2 bg-input border-border text-foreground placeholder:text-muted-foreground"
              maxLength={1000}
              disabled={isGuestSubmitting}
            />
            <div className="flex justify-end items-center">
              <span className="text-xs text-muted-foreground mr-2">{commentText.length}/1000</span>
              <Button type="submit" disabled={isGuestSubmitting || !commentText.trim()} size="sm">
                {isGuestSubmitting ? <LoadingSpinner size="sm" className="mr-1" /> : <Send size={16} className="mr-1" />}
                {isGuestSubmitting ? 'Posting...' : 'Post Comment'}
              </Button>
            </div>
          </form>
        ) : ( // Fallback for profile loading state
            <div className="flex justify-center items-center py-8">
                <LoadingSpinner size="sm" />
                <span className="ml-2 text-muted-foreground text-sm">Loading profile information...</span>
            </div>
        )}
      </div>

      {/* Display Comments (logic remains the same) */}
      {/* ... (your existing comments display logic) ... */}
       {loadingComments && comments.length === 0 ? (
        <div className="flex justify-center items-center py-8">
          <LoadingSpinner size="md" />
          <span className="ml-2 text-muted-foreground">Loading comments...</span>
        </div>
      ) : error ? (
        <p className="text-destructive text-center py-4">{error}</p>
      ) : comments.length === 0 && !loadingComments ? (
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
                disabled={loadingMore || isGuestSubmitting }
                className="text-primary border-primary hover:bg-primary/10"
              >
                <RefreshCw size={16} className="mr-2" />
                Load More Comments ({totalComments - comments.length} remaining)
              </Button>
            </div>
          )}
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
});
ChapterComments.displayName = 'ChapterComments';

export default ChapterComments;