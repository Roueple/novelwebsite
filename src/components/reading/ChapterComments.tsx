// src/components/reading/ChapterComments.tsx
"use client";

import React, { useState, useEffect, useCallback, memo, useRef } from 'react';

// Import types from their canonical sources
import type { User as SupabaseUser, Session as SupabaseSession } from '@supabase/supabase-js'; // For Supabase User object
import type { Profile as AppProfile, UserRole as AppUserRole } from '@/types'; // Your app-specific types

import { useAuth } from '@/providers/auth-provider';
import { getChapterComments, addComment, deleteComment, type DisplayComment } from '@/lib/api';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { Send, Trash2, RefreshCw, MessageSquare, Mail, KeyRound, UserPlus, Link as LinkIcon } from 'lucide-react'; // Added LinkIcon
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// CommentItem Component (remains unchanged from your provided code)
interface CommentItemProps {
  comment: DisplayComment;
  currentUser: SupabaseUser | null;
  currentUserRole: AppUserRole | null;
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
    return c.user_id ? `User (${c.user_id.substring(0,6)})` : 'Anonymous';
  }, []);

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

const COMMENTS_PER_PAGE = 15;
const ChapterComments = memo(({ chapterId, novelId }: ChapterCommentsProps) => {
  // Use signInWithEmail from useAuth. verifyEmailOtp is not directly used in this component's flow anymore.
  const { user, role, loading: authLoading, profileLoading, profile, signInWithEmail } = useAuth();

  const [comments, setComments] = useState<DisplayComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  // Guest signup flow states
  const [guestEmail, setGuestEmail] = useState('');
  const [guestDisplayName, setGuestDisplayName] = useState('');
  // REMOVE otpValue state: const [otpValue, setOtpValue] = useState('');
  const [isAwaitingMagicLinkConfirmation, setIsAwaitingMagicLinkConfirmation] = useState(false); // RENAMED from isAwaitingOtp
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalComments, setTotalComments] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const guestInputRef = useRef({ email: '', displayName: '', text: '' });

  const fetchComments = useCallback(async (page = 1, append = false) => {
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

  // This effect handles finalizing the comment submission after the user clicks the magic link
  // and their session/profile is updated by AuthProvider.
  useEffect(() => {
    if (user && profile && isAwaitingMagicLinkConfirmation) {
      console.log("[ChapterComments] User authenticated and profile loaded after magic link. Finalizing post.");
      finalizeSignupAndPostComment(guestInputRef.current.displayName, guestInputRef.current.text);
      setIsAwaitingMagicLinkConfirmation(false); // Reset confirmation state
    }
  }, [user, profile, isAwaitingMagicLinkConfirmation]); // DEPENDENCY updated

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchComments(currentPage + 1, true);
    }
  };

  // Renamed from handleGuestOtpInitiation
  const handleGuestMagicLinkInitiation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestEmail.trim() || !guestDisplayName.trim() || !commentText.trim()) {
      toast.warning("Please fill in your email, display name, and comment.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim())) {
        toast.error("Please enter a valid email address.");
        return;
    }
    setIsSubmitting(true);
    toast.info("Sending verification link to your email..."); // UPDATED toast message
    guestInputRef.current = {
        email: guestEmail.trim(),
        displayName: guestDisplayName.trim(),
        text: commentText.trim()
    };
    try {
      // signInWithEmail already configures the redirect to /auth/callback for magic link
      await signInWithEmail(guestEmail.trim());
      setIsAwaitingMagicLinkConfirmation(true); // SET updated state
      toast.success("Verification link sent! Please check your email and click the link to complete sign up and post your comment.", { duration: 10000 }); // UPDATED toast message
    } catch (error: any) {
      toast.error(`Error: ${error.message || "Could not send verification link."}`); // UPDATED toast message
      guestInputRef.current = { email: '', displayName: '', text: '' };
    } finally {
      setIsSubmitting(false);
    }
  };

  // REMOVE handleOtpVerification function entirely
  // const handleOtpVerification = async (e: React.FormEvent) => { ... };

  const finalizeSignupAndPostComment = async (displayNameForProfile: string, commentTextForPost: string) => {
    if (!user || !user.id || !user.email) {
        toast.error("User session not found after verification. Cannot post comment.");
        setIsSubmitting(false);
        setIsAwaitingMagicLinkConfirmation(false); // RESET state
        return;
    }
    console.log(`[ChapterComments] Finalizing signup for user ${user.id} and posting comment.`);
    setIsSubmitting(true);
    try {
      // The API route /api/profiles/complete-signup-and-comment handles profile creation/update
      // and comment submission. It uses the session cookie to identify the user.
      const response = await fetch('/api/profiles/complete-signup-and-comment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            // userId: user.id, // API gets user from session
            // email: user.email, // API gets user from session
            displayName: displayNameForProfile,
            commentText: commentTextForPost,
            chapterId: chapterId,
            novelId: novelId,
          }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'API error during final submission.');

      toast.success(result.message || "Account setup complete and comment submitted!");
      setGuestEmail('');
      setGuestDisplayName('');
      setCommentText('');
      guestInputRef.current = { email: '', displayName: '', text: '' };
      fetchComments(1, false); // Refresh comments
    } catch (apiError: any) {
        console.error("API error during finalizeSignupAndPostComment:", apiError);
        toast.error(`Error posting comment after signup: ${apiError.message}. Please try again or check your profile.`);
    } finally {
        setIsSubmitting(false);
        setIsAwaitingMagicLinkConfirmation(false); // RESET state
    }
};

  const handleRegisteredUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) {
      toast.error("You must be logged in with a complete profile to comment.");
      return;
    }
    if (!commentText.trim()) {
      toast.warning("Comment cannot be empty.");
      return;
    }
    setIsSubmitting(true);
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
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = useCallback(async (commentId: number) => {
    if (!user) return;
    if (!confirm("Are you sure you want to delete this comment?")) return;
    setDeletingId(commentId);
    try {
      const success = await deleteComment(commentId);
      if (success) {
        toast.success("Comment deleted.");
        setComments(prevComments => prevComments.filter(c => c.id !== commentId));
        setTotalComments(prevTotal => Math.max(0, prevTotal - 1));
      } else { throw new Error("Failed to delete comment via API."); }
    } catch (err: any) { console.error("Error deleting comment", err); toast.error("Failed to delete comment.")} finally { setDeletingId(null); }
  }, [user]);


  if (authLoading && !user) {
    return (
      <div className="mt-8 pt-6 border-t border-border flex flex-col items-center">
        <LoadingSpinner />
        <p className="text-muted-foreground mt-2 text-sm">Loading comments section...</p>
      </div>
    );
  }

  return (
    <div className="mt-8 pt-6 border-t border-border">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-foreground">Comments ({totalComments})</h3>
        <Button variant="ghost" size="sm" onClick={() => fetchComments(1, false)} disabled={loadingComments || loadingMore || isSubmitting} title="Refresh comments">
            <RefreshCw size={14} className={cn("mr-1", (loadingComments || loadingMore || isSubmitting) && "animate-spin")} />
            Refresh
        </Button>
      </div>

      <div className="mb-6">
        {/* Guest Signup / Login via Magic Link */}
        {!user ? (
          !isAwaitingMagicLinkConfirmation ? ( // Check RENAMED state
            // Initial form to get email, display name, and comment
            <form onSubmit={handleGuestMagicLinkInitiation} className="p-4 bg-card border border-border rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-sm text-primary font-medium">
                <Mail size={18} />
                <span>Post a Comment & Sign Up/Login via Email Link</span>
              </div>
              <div>
                <label htmlFor="guestEmail-comment" className="block text-xs font-medium text-muted-foreground mb-1">Your Email</label>
                <Input id="guestEmail-comment" type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} placeholder="you@example.com" required disabled={isSubmitting} className="bg-input"/>
              </div>
              <div>
                <label htmlFor="guestDisplayName-comment" className="block text-xs font-medium text-muted-foreground mb-1">Display Name (Public)</label>
                <Input id="guestDisplayName-comment" type="text" value={guestDisplayName} onChange={(e) => setGuestDisplayName(e.target.value)} placeholder="How you'll appear" required disabled={isSubmitting} className="bg-input"/>
              </div>
              <div>
                <label htmlFor="commentText-guest" className="block text-xs font-medium text-muted-foreground mb-1">Your Comment</label>
                <Textarea id="commentText-guest" value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Share your thoughts..." rows={3} required disabled={isSubmitting} className="bg-input"/>
                <p className="text-xs text-muted-foreground mt-1">{commentText.length}/1000</p>
              </div>
              <Button type="submit" disabled={isSubmitting || !guestEmail.trim() || !guestDisplayName.trim() || !commentText.trim()} className="w-full sm:w-auto">
                {isSubmitting ? <LoadingSpinner size="sm" className="mr-1" /> : <LinkIcon size={16} className="mr-1" />} {/* UPDATED Icon */}
                {isSubmitting ? 'Sending Link...' : 'Send Verification Link'} {/* UPDATED Button Text */}
              </Button>
            </form>
          ) : (
            // Message shown after magic link initiation
            <div className="p-4 bg-card border border-border rounded-lg space-y-3 text-center">
              <div className="flex items-center justify-center gap-2 text-sm text-primary font-medium mb-2">
                <Mail size={20} />
                <span>Check Your Email</span>
              </div>
              <p className="text-sm text-foreground">
                A verification link has been sent to <strong>{guestInputRef.current.email || guestEmail}</strong>.
              </p>
              <p className="text-sm text-muted-foreground">
                Please click the link in that email to complete your sign-up and post your comment. You can close this message.
              </p>
              <Button variant="link" size="sm" onClick={() => { setIsAwaitingMagicLinkConfirmation(false); }} className="text-xs mt-2">
                Entered wrong email or need to change details?
              </Button>
            </div>
          )
        ) : !profile && !profileLoading ? (
          // User is logged in but profile is incomplete
          <div className="p-4 bg-card border border-border rounded-md text-center">
            <MessageSquare className="mx-auto mb-2 text-muted-foreground" size={28}/>
            <p className="text-accent-foreground">
                Almost there! Please <Link href="/profile/setup" className="font-semibold underline hover:text-primary">complete your profile</Link> to post comments.
            </p>
            {/* Removed the part about auto-generated username as profile setup handles that choice */}
          </div>
        ) : profile ? (
          // Registered and profile-complete user comment form
          <form onSubmit={handleRegisteredUserSubmit}>
            <Textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Share your thoughts on this chapter..."
              rows={3}
              className="mb-2 bg-input border-border text-foreground placeholder:text-muted-foreground"
              maxLength={1000}
              disabled={isSubmitting || authLoading || profileLoading}
            />
            <div className="flex justify-end items-center">
              <span className="text-xs text-muted-foreground mr-2">{commentText.length}/1000</span>
              <Button type="submit" disabled={isSubmitting || !commentText.trim() || authLoading || profileLoading} size="sm">
                {isSubmitting ? <LoadingSpinner size="sm" className="mr-1" /> : <Send size={16} className="mr-1" />}
                {isSubmitting ? 'Posting...' : 'Post Comment'}
              </Button>
            </div>
          </form>
        ) : (
            // Fallback while profile is loading for an authenticated user
           <div className="flex justify-center items-center py-8">
                <LoadingSpinner size="sm" />
                <span className="ml-2 text-muted-foreground text-sm">Loading your profile information...</span>
            </div>
        )}
      </div>

      {/* Display Comments Section (remains unchanged) */}
      {loadingComments && comments.length === 0 && !error ? (
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
                disabled={loadingMore || isSubmitting }
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