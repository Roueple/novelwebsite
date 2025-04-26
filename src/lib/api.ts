// src/lib/api.ts
import { supabase } from './supabase';
import type { Novel, Chapter, NovelType, ChapterType, Comment, Profile } from '@/types/supabase';
import { PostgrestError } from '@supabase/supabase-js';

// Type guard for PostgrestError
function isPostgrestError(error: any): error is PostgrestError {
  // Basic check for Supabase error structure
  return error && typeof error.message === 'string' && typeof error.code === 'string';
}

// Error handling utility with improved logging
function handleSupabaseError(error: unknown, context: string): null {
  let message = 'An unknown error occurred';
  if (isPostgrestError(error)) {
    // Log specific Supabase error details
    message = `Supabase Error (${context}): ${error.message} (Code: ${error.code})`;
    console.error(message, { details: error.details, hint: error.hint });
  } else if (error instanceof Error) {
    // Log standard JavaScript error
    message = `Error (${context}): ${error.message}`;
    console.error(message, error.stack);
  } else {
     // Log any other type of error
     console.error(`Unknown Error (${context}):`, error);
  }
  // Return null to indicate failure in API functions that expect an object/array
  return null;
}


// Common select fields for consistency and maintainability
const NOVEL_SELECT = `
  id, title, cover_url, author, author_id, rating, status, tags, description, created_at, updated_at
`;
const CHAPTER_SELECT = `
  id, novel_id, chapter_number, title, content, is_locked, newly_created, created_at, updated_at
`;
const COMMENT_SELECT = `
  id, created_at, updated_at, user_id, chapter_id, parent_comment_id, content, is_approved,
  profiles ( username, is_guest )
`;

// --- Novel Functions ---

/**
 * Searches novels based on title, author, or description.
 * @param query - The search term.
 * @returns A promise resolving to an array of Novels or an empty array.
 */
export async function searchNovels(query: string): Promise<Novel[]> {
  try {
    // Basic sanitization and check for empty query
    const sanitizedQuery = query.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim();
    if (!sanitizedQuery) return [];

    // Perform the search query
    const { data, error } = await supabase
      .from('novels')
      .select(NOVEL_SELECT)
      .or(
        `title.ilike.%${sanitizedQuery}%,author.ilike.%${sanitizedQuery}%,description.ilike.%${sanitizedQuery}%`
      )
      .order('updated_at', { ascending: false })
      .limit(50); // Limit results for performance

    if (error) throw error; // Throw Supabase errors to be caught below
    return data || []; // Return fetched data or empty array
  } catch (error) {
    // Handle errors and return an empty array as fallback
    return handleSupabaseError(error, 'searchNovels') ?? [];
  }
}

/**
 * Fetches the latest novels.
 * @param limit - Maximum number of novels to fetch (default: 20).
 * @returns A promise resolving to an array of Novels or an empty array.
 */
export async function getLatestNovels(limit = 20): Promise<Novel[]> {
  try {
    const { data, error } = await supabase
      .from('novels')
      .select(NOVEL_SELECT)
      .order('created_at', { ascending: false }) // Order by creation date, newest first
      .limit(limit);
    if (error) throw error;
    return data || [];
  } catch (error) {
    return handleSupabaseError(error, 'getLatestNovels') ?? [];
  }
}

/**
 * Fetches metadata for a single novel by its ID.
 * @param id - The ID of the novel.
 * @returns A promise resolving to the Novel object or null if not found or error.
 */
export async function getNovel(id: number): Promise<Novel | null> {
  // Validate ID
  if (isNaN(id) || id <= 0) {
     console.error('[api.getNovel] Invalid novel ID requested:', id);
     return null;
  }
  try {
    // Fetch a single row
    const { data, error } = await supabase
        .from('novels')
        .select(NOVEL_SELECT)
        .eq('id', id)
        .single();

    // Handle specific "Row not found" error gracefully
    if (error && error.code === 'PGRST116') {
        console.log(`[api.getNovel] Novel with ID ${id} not found.`);
        return null;
    }
    if (error) throw error; // Throw other Supabase errors

    return data as Novel || null; // Return data or null
  } catch (error) {
    return handleSupabaseError(error, `getNovel (ID: ${id})`);
  }
}

// --- Chapter Functions ---

/**
 * Fetches all chapters for a given novel ID, ordered by chapter number.
 * @param novelId - The ID of the novel.
 * @returns A promise resolving to an array of ChapterType or an empty array.
 */
export async function getNovelChapters(novelId: number): Promise<ChapterType[]> {
  if (isNaN(novelId) || novelId <= 0) {
    console.error('[api.getNovelChapters] Invalid novel ID:', novelId);
    return [];
  }
  try {
    const { data, error } = await supabase
      .from('chapters')
      .select(CHAPTER_SELECT)
      .eq('novel_id', novelId)
      .order('chapter_number', { ascending: true }); // Order chapters correctly
    if (error) throw error;
    return (data as ChapterType[]) || []; // Ensure return type is always array
  } catch (error) {
    return handleSupabaseError(error, `getNovelChapters (Novel ID: ${novelId})`) ?? [];
  }
}

/**
 * Fetches a specific chapter by novel ID and chapter number.
 * @param novelId - The ID of the novel.
 * @param chapterNumber - The number of the chapter.
 * @returns A promise resolving to the ChapterType object or null.
 */
export async function getChapter(novelId: number, chapterNumber: number): Promise<ChapterType | null> {
   if (isNaN(novelId) || novelId <= 0 || isNaN(chapterNumber) || chapterNumber <= 0) {
     console.error('[api.getChapter] Invalid novel or chapter ID requested:', { novelId, chapterNumber });
     return null;
  }
  try {
    const { data, error } = await supabase
      .from('chapters')
      .select(CHAPTER_SELECT)
      .eq('novel_id', novelId)
      .eq('chapter_number', chapterNumber)
      .single(); // Expect only one chapter

    if (error && error.code === 'PGRST116') {
       console.log(`[api.getChapter] Chapter number ${chapterNumber} for novel ${novelId} not found.`);
       return null;
    }
    if (error) throw error;

    return data as ChapterType || null;
  } catch (error) {
    return handleSupabaseError(error, `getChapter (Novel: ${novelId}, Chapter: ${chapterNumber})`);
  }
}

/**
 * Deletes a specific chapter.
 * @param novelId - The ID of the novel (for verification).
 * @param chapterId - The ID of the chapter to delete.
 * @returns A promise resolving to true on success, false on failure.
 */
export async function deleteChapter(novelId: number, chapterId: number): Promise<boolean> {
   if (isNaN(novelId) || novelId <= 0 || isNaN(chapterId) || chapterId <= 0) {
     console.error('[api.deleteChapter] Invalid novel or chapter ID for deletion:', { novelId, chapterId });
     return false;
  }
  try {
    // Ensure deletion targets the correct novel using eq('novel_id', novelId)
    const { error } = await supabase
        .from('chapters')
        .delete()
        .eq('id', chapterId)
        .eq('novel_id', novelId);
    if (error) throw error;
    return true;
  } catch (error) {
    handleSupabaseError(error, `deleteChapter (Chapter ID: ${chapterId})`);
    return false;
  }
}

/**
 * Adds a new chapter to a novel.
 * @param novelId - The ID of the novel to add the chapter to.
 * @param chapterData - Partial chapter data (requires at least chapter_number).
 * @returns A promise resolving to the newly created ChapterType object or null.
 */
export async function addChapter(novelId: number, chapterData: Partial<ChapterType>): Promise<ChapterType | null> {
   if (isNaN(novelId) || novelId <= 0) { console.error('[api.addChapter] Invalid novel ID:', novelId); return null; }
  if (!chapterData.chapter_number || chapterData.chapter_number <= 0) { console.error('[api.addChapter] Invalid chapter number provided:', chapterData.chapter_number); return null; }
  try {
    const { data, error } = await supabase
      .from('chapters')
      .insert({ ...chapterData, novel_id: novelId }) // Ensure novel_id is set
      .select(CHAPTER_SELECT) // Select the full data of the new chapter
      .single();
    if (error) throw error;
    return data as ChapterType || null;
  } catch (error) {
    return handleSupabaseError(error, `addChapter (Novel ID: ${novelId})`);
  }
}

/**
 * Updates an existing chapter.
 * @param novelId - The ID of the novel (for verification).
 * @param chapterId - The ID of the chapter to update.
 * @param updateData - An object containing the fields to update.
 * @returns A promise resolving to true on success, false on failure.
 */
export async function updateChapter(novelId: number, chapterId: number, updateData: Partial<Omit<ChapterType, 'id' | 'novel_id' | 'created_at'>>): Promise<boolean> {
  if (isNaN(novelId) || novelId <= 0 || isNaN(chapterId) || chapterId <= 0) { console.error('[api.updateChapter] Invalid novel or chapter ID for update:', { novelId, chapterId }); return false; }

  // Ensure there's actually data to update
  const cleanData = { ...updateData };
  if (Object.keys(cleanData).length === 0) { console.warn("[api.updateChapter] called with empty data."); return true; } // No update needed

  try {
    console.log(`[api.updateChapter] Updating chapter ${chapterId} with data:`, cleanData);
    // Ensure update targets the correct novel
    const { error } = await supabase
        .from('chapters')
        .update(cleanData)
        .eq('id', chapterId)
        .eq('novel_id', novelId);
    if (error) throw error;
    return true;
  } catch (error) {
    handleSupabaseError(error, `updateChapter (Chapter ID: ${chapterId})`);
    return false;
  }
}

/**
 * Updates the lock status for all chapters of a novel.
 * @param novelId - The ID of the novel.
 * @param isLocked - The new lock status (true for locked, false for unlocked).
 * @returns A promise resolving to true on success, false on failure.
 */
export async function updateAllChaptersLockStatus(novelId: number, isLocked: boolean): Promise<boolean> {
  if (isNaN(novelId) || novelId <= 0) { console.error('[api.updateAllChaptersLockStatus] Invalid novel ID:', novelId); return false; }
  try {
    console.log(`[api.updateAllChaptersLockStatus] Setting all chapters for novel ${novelId} to is_locked: ${isLocked}`);
    const { error } = await supabase
        .from('chapters')
        .update({ is_locked: isLocked })
        .eq('novel_id', novelId);
    if (error) throw error;
    console.log(`[api.updateAllChaptersLockStatus] Bulk update successful for novel ${novelId}.`);
    return true;
  } catch (error) {
    handleSupabaseError(error, `updateAllChaptersLockStatus (Novel ID: ${novelId})`);
    return false;
  }
}

// --- COMMENT FUNCTIONS ---

/**
 * Fetches comments for a specific chapter.
 * RLS policy automatically filters based on approval status for non-admins.
 * Includes commenter's username and guest status.
 * @param chapterId - The ID of the chapter.
 * @returns A promise resolving to an array of Comments or an empty array.
 */
export async function getChapterComments(chapterId: number): Promise<Comment[]> {
  if (isNaN(chapterId) || chapterId <= 0) { console.error('[api.getChapterComments] Invalid chapter ID:', chapterId); return []; }
  try {
    const { data, error } = await supabase
      .from('comments')
      .select(COMMENT_SELECT) // Includes profiles(username, is_guest)
      .eq('chapter_id', chapterId)
      .is('parent_comment_id', null) // Fetch only top-level comments
      .order('created_at', { ascending: true }); // Oldest first

    if (error) throw error;

    // Process data to ensure 'profiles' matches the expected type (object or null)
    const commentsWithCorrectProfileType = (data || []).map((c: any) => {
      let profileData: Pick<Profile, 'username' | 'is_guest'> | null = null;
      if (c.profiles && typeof c.profiles === 'object' && !Array.isArray(c.profiles)) {
        profileData = { username: c.profiles.username, is_guest: c.profiles.is_guest };
      }
      // Remove the original 'profiles' field before spreading base comment
      const { profiles, ...baseComment } = c;
      return { ...baseComment, profiles: profileData };
    });

    return commentsWithCorrectProfileType as Comment[];
  } catch (error) {
    return handleSupabaseError(error, `getChapterComments (Chapter ID: ${chapterId})`) ?? [];
  }
}

/**
 * Adds a new comment to a chapter. Comment defaults to unapproved.
 * @param userId - The ID of the user (can be anonymous/guest).
 * @param chapterId - The ID of the chapter being commented on.
 * @param content - The text content of the comment.
 * @param parentCommentId - Optional ID of the parent comment for replies.
 * @returns A promise resolving to the newly created Comment object (with profile info) or null.
 */
export async function addComment(userId: string, chapterId: number, content: string, parentCommentId: number | null = null): Promise<Comment | null> {
  console.log(`[api.addComment] Attempting insert: userId=${userId}, chapterId=${chapterId}`);
  if (!userId) { console.error('[api.addComment] User ID is required.'); return null; }
  if (isNaN(chapterId) || chapterId <= 0) { console.error('[api.addComment] Invalid chapter ID:', chapterId); return null; }
  if (!content.trim()) { console.error('[api.addComment] Comment content cannot be empty.'); return null; }

  try {
    // Step 1: Insert the comment (is_approved defaults to false in DB)
    console.log('[api.addComment] Inserting comment data...');
    const { data: insertedComment, error: insertError } = await supabase
      .from('comments')
      .insert({ user_id: userId, chapter_id: chapterId, content: content.trim(), parent_comment_id: parentCommentId })
      .select() // Select the basic inserted row
      .single();

    if (insertError) {
        console.error('[api.addComment] Supabase insert error:', insertError);
        throw insertError;
    }
    if (!insertedComment) {
        console.error('[api.addComment] Insert succeeded but no data returned.');
        return null; // Cannot proceed without the inserted comment data
    }
    console.log('[api.addComment] Insert successful, comment ID:', insertedComment.id);

    // Step 2: Fetch the profile data for the commenter
    console.log(`[api.addComment] Fetching profile for userId: ${userId}`);
    const { data: profileDataResult, error: profileError } = await supabase
        .from('profiles')
        .select('username, is_guest')
        .eq('id', userId)
        .maybeSingle(); // Profile might exist or might have just been created

     if (profileError) {
         // Log error but continue, profile might be missing temporarily
         console.error("[api.addComment] Error fetching profile for new comment:", profileError);
     } else {
          console.log("[api.addComment] Profile fetch successful:", profileDataResult);
     }

     // Ensure profileDataResult is treated as an object or null
     const profileData = profileDataResult as Pick<Profile, 'username' | 'is_guest'> | null;

    // Step 3: Construct the final Comment object to return to the client
    const finalComment: Comment = {
        ...(insertedComment as Omit<Comment, 'profiles'>), // Use inserted data
        profiles: profileData ? { username: profileData.username, is_guest: profileData.is_guest } : null, // Add fetched profile
        is_approved: insertedComment.is_approved ?? false // is_approved from inserted data (should be false)
    };
    console.log("[api.addComment] Successfully constructed final comment object:", finalComment);
    return finalComment;

  } catch (error) {
    console.error(`[api.addComment] Caught error during comment addition for chapter ${chapterId}:`, error);
    return handleSupabaseError(error, `addComment (Chapter ID: ${chapterId})`);
  }
}

/**
 * Deletes a comment by its ID. Relies on RLS for authorization.
 * @param commentId - The ID of the comment to delete.
 * @returns A promise resolving to true on success, false on failure.
 */
export async function deleteComment(commentId: number): Promise<boolean> {
   if (isNaN(commentId) || commentId <= 0) { console.error('[api.deleteComment] Invalid comment ID:', commentId); return false; }
  try {
    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (error) throw error;
    return true;
  } catch (error) {
    handleSupabaseError(error, `deleteComment (Comment ID: ${commentId})`);
    return false;
  }
}

// --- ADMIN MODERATION FUNCTIONS ---

/**
 * Fetches all unapproved comments. (Requires admin privileges via RLS).
 * Includes chapter and novel context.
 * @returns A promise resolving to an array of Comments with context or an empty array.
 */
export async function getUnapprovedComments(): Promise<(Comment & { chapters: { title: string, novel_id: number, novels: { title: string, id: number } | null } | null })[]> {
   try {
    // Select comment data, chapter title/novel_id, and novel title/id
    const { data, error } = await supabase
      .from('comments')
      .select(`
        ${COMMENT_SELECT},
        chapters ( title, novel_id, novels ( title, id ) )
      `)
      .eq('is_approved', false) // Filter for unapproved
      .order('created_at', { ascending: true }); // Oldest first

    if (error) throw error;

     // Process data to ensure correct nested types
     const commentsWithContext = (data || []).map((c: any) => {
        // Process profile data
        let profileData: Pick<Profile, 'username' | 'is_guest'> | null = null;
        if (c.profiles && typeof c.profiles === 'object' && !Array.isArray(c.profiles)) {
            profileData = { username: c.profiles.username, is_guest: c.profiles.is_guest };
        }
        // Process chapters/novels data
        let chapterDataProcessed: { title: string; novel_id: number; novels: { title: string; id: number; } | null; } | null = null;
        if (c.chapters && typeof c.chapters === 'object' && !Array.isArray(c.chapters)) {
            let novelDataProcessed: { title: string; id: number; } | null = null;
            if (c.chapters.novels && typeof c.chapters.novels === 'object' && !Array.isArray(c.chapters.novels)) {
                novelDataProcessed = { title: c.chapters.novels.title, id: c.chapters.novels.id };
            }
            chapterDataProcessed = {
                title: c.chapters.title, novel_id: c.chapters.novel_id, novels: novelDataProcessed
            };
        }
        // Remove original joined fields before spreading base comment
        const { profiles, chapters, ...baseComment } = c;
        // Construct final object
        return { ...baseComment, profiles: profileData, chapters: chapterDataProcessed };
    });

    // Cast the final result
    return commentsWithContext as (Comment & { chapters: { title: string, novel_id: number, novels: { title: string, id: number } | null } | null })[];
  } catch (error) {
    return handleSupabaseError(error, 'getUnapprovedComments') ?? [];
  }
}

/**
 * Approves a specific comment by setting is_approved to true. (Requires admin privileges).
 * @param commentId - The ID of the comment to approve.
 * @returns A promise resolving to true on success, false on failure.
 */
export async function approveComment(commentId: number): Promise<boolean> {
   if (isNaN(commentId) || commentId <= 0) { console.error('[api.approveComment] Invalid comment ID:', commentId); return false; }
  try {
    // Update the comment's status
    const { error } = await supabase
      .from('comments')
      .update({ is_approved: true, updated_at: new Date().toISOString() }) // Set approved and update timestamp
      .eq('id', commentId);
    if (error) throw error;
    return true;
  } catch (error) {
    handleSupabaseError(error, `approveComment (Comment ID: ${commentId})`);
    return false;
  }
}
