// src/lib/api.ts
import { supabase } from './supabase';
import type {
  Novel,
  // Chapter, // Base Chapter type, might not be used directly if Chapter is preferred
  Chapter, // Usually Chapter & { content: string | null }
  Comment,
  Profile,
  UserRole, // Assuming UserRole is 'admin' | 'reader' from @/types
  // NovelType, // If you have a NovelWithChapters type
} from '@/types'; // Centralized types
import { PostgrestError } from '@supabase/supabase-js';

// Type guard for PostgrestError (remains the same)
function isPostgrestError(error: any): error is PostgrestError {
  return error && typeof error.message === 'string' && typeof error.code === 'string';
}

// Error handling utility (remains the same)
function handleSupabaseError(error: unknown, context: string): null {
  let message = 'An unknown error occurred';
  if (isPostgrestError(error)) {
    message = `Supabase Error (${context}): ${error.message} (Code: ${error.code})`;
    console.error(message, { details: error.details, hint: error.hint });
  } else if (error instanceof Error) {
    message = `Error (${context}): ${error.message}`;
    console.error(message, error.stack);
  } else {
    console.error(`Unknown Error (${context}):`, error);
  }
  // In production, consider logging to an external service
  return null;
}

// Common select fields
const NOVEL_SELECT_FIELDS = `
  id, title, cover_url, author, author_id, rating, status, tags, description, created_at, updated_at,
  is_hidden, like_count, view_count
`;

const CHAPTER_META_SELECT_FIELDS = `
  id, novel_id, chapter_number, title, is_locked, newly_created, created_at, updated_at
`; // For lists, no content

const CHAPTER_FULL_SELECT_FIELDS = `
  id, novel_id, chapter_number, title, content, is_locked, newly_created, created_at, updated_at
`; // For single chapter view, includes content

const COMMENT_SELECT_FIELDS = `
  id, created_at, updated_at, user_id, chapter_id, parent_comment_id, content, is_approved,
  profiles ( id, username, display_name, role )
`; // Fetches related profile data


// --- Novel Functions ---
export async function searchNovels(query: string): Promise<Novel[]> {
  try {
    const sanitizedQuery = query.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim();
    if (!sanitizedQuery) return [];
    const { data, error } = await supabase
      .from('novels')
      .select(NOVEL_SELECT_FIELDS)
      .or(`title.ilike.%${sanitizedQuery}%,author.ilike.%${sanitizedQuery}%,description.ilike.%${sanitizedQuery}%`)
      .order('updated_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return data || [];
  } catch (error) {
    return handleSupabaseError(error, 'searchNovels') ?? [];
  }
}

export async function getLatestNovels(limit = 20): Promise<Novel[]> {
  try {
    const { data, error } = await supabase
      .from('novels')
      .select(NOVEL_SELECT_FIELDS)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  } catch (error) {
    return handleSupabaseError(error, 'getLatestNovels') ?? [];
  }
}

export async function getNovel(id: number): Promise<Novel | null> {
  if (isNaN(id) || id <= 0) {
    console.error('[api.getNovel] Invalid novel ID requested:', id);
    return null;
  }
  try {
    const { data, error } = await supabase
      .from('novels')
      .select(NOVEL_SELECT_FIELDS)
      .eq('id', id)
      .single();
    if (error && error.code === 'PGRST116') {
      console.log(`[api.getNovel] Novel with ID ${id} not found.`);
      return null;
    }
    if (error) throw error;
    return data as Novel || null;
  } catch (error) {
    return handleSupabaseError(error, `getNovel (ID: ${id})`);
  }
}

export async function updateNovelDetails(
  novelId: number,
  updateData: Partial<Omit<Novel, 'id' | 'created_at' | 'updated_at' | 'rating' /* author_id might be updatable by admin */ >>
): Promise<boolean> {
  if (isNaN(novelId) || novelId <= 0) {
    console.error('[api.updateNovelDetails] Invalid novel ID:', novelId);
    return false;
  }
  if (Object.keys(updateData).length === 0) {
    console.warn("[api.updateNovelDetails] called with empty data.");
    return true;
  }
  // Clean out fields that shouldn't be directly updated or are managed by DB
  delete (updateData as any).id;
  delete (updateData as any).created_at;
  delete (updateData as any).updated_at;
  // delete (updateData as any).rating; // Rating might be managed differently

  try {
    console.log(`[api.updateNovelDetails] Updating novel ${novelId}:`, updateData);
    const { error } = await supabase
      .from('novels')
      .update(updateData)
      .eq('id', novelId);
    if (error) throw error;
    return true;
  } catch (error) {
    handleSupabaseError(error, `updateNovelDetails (Novel ID: ${novelId})`);
    return false;
  }
}


// --- Chapter Functions ---
export async function getNovelChapters(novelId: number): Promise<Chapter[]> {
  if (isNaN(novelId) || novelId <= 0) {
    console.error('[api.getNovelChapters] Invalid novel ID:', novelId);
    return [];
  }
  try {
    const { data, error } = await supabase
      .from('chapters')
      .select(CHAPTER_META_SELECT_FIELDS) // Selects metadata only, no content
      .eq('novel_id', novelId)
      .order('chapter_number', { ascending: true });
    if (error) throw error;
    return (data as Chapter[]) || [];
  } catch (error) {
    return handleSupabaseError(error, `getNovelChapters (Novel ID: ${novelId})`) ?? [];
  }
}

// Helper to get a user's role (simplified, assumes user is authenticated)
async function getUserRole(userId: string): Promise<UserRole | null> {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return profile?.role || null;
  } catch (err) {
    handleSupabaseError(err, `getUserRole for ${userId}`);
    return null;
  }
}

export async function getChapter(
  novelId: number,
  chapterNumber: number,
  requestingUserId: string | null // ID of the user making the request
): Promise<Chapter | null> {
  if (isNaN(novelId) || novelId <= 0 || isNaN(chapterNumber) || chapterNumber <= 0) {
    console.error('[api.getChapter] Invalid novel or chapter ID requested:', { novelId, chapterNumber });
    return null;
  }
  console.log(`[api.getChapter] Fetching chapter ${chapterNumber} for novel ${novelId}, requested by user: ${requestingUserId || 'Not Logged In'}`);

  try {
    const { data: chapterData, error } = await supabase
      .from('chapters')
      .select(CHAPTER_FULL_SELECT_FIELDS) // Fetches content
      .eq('novel_id', novelId)
      .eq('chapter_number', chapterNumber)
      .single();

    if (error && error.code === 'PGRST116') {
      console.log(`[api.getChapter] Chapter number ${chapterNumber} for novel ${novelId} not found.`);
      return null;
    }
    if (error) throw error;
    if (!chapterData) return null;

    const typedChapter = chapterData as Chapter;

    // If chapter is not locked, return full content
    if (!typedChapter.is_locked) {
      return typedChapter;
    }

    // Chapter IS locked. Check authorization.
    // Only admins can see locked content for now. Subscription logic would go here in the future.
    if (requestingUserId) {
      const userRole = await getUserRole(requestingUserId);
      if (userRole === 'admin') {
        console.log(`[api.getChapter] Admin ${requestingUserId} authorized for locked chapter ${typedChapter.id}.`);
        return typedChapter; // Admin sees full content
      }
    }

    // User is not an admin (or not logged in) and chapter is locked
    console.log(`[api.getChapter] User ${requestingUserId || 'Not Logged In'} NOT authorized for locked chapter ${typedChapter.id}. Returning content as null.`);
    return { ...typedChapter, content: null }; // Return metadata but null content

  } catch (err) {
    return handleSupabaseError(err, `getChapter (Novel: ${novelId}, Chapter: ${chapterNumber})`);
  }
}

export async function addChapter(
  novelId: number,
  chapterData: Pick<Chapter, 'chapter_number' | 'title' | 'content' | 'is_locked' | 'newly_created'>
): Promise<Chapter | null> {
  if (isNaN(novelId) || novelId <= 0) {
    console.error('[api.addChapter] Invalid novel ID:', novelId);
    return null;
  }
  if (!chapterData.chapter_number || chapterData.chapter_number <= 0) {
    console.error('[api.addChapter] Invalid chapter number:', chapterData.chapter_number);
    return null;
  }
  try {
    const { data, error } = await supabase
      .from('chapters')
      .insert({ ...chapterData, novel_id: novelId })
      .select(CHAPTER_FULL_SELECT_FIELDS)
      .single();
    if (error) throw error;
    return data as Chapter || null;
  } catch (error) {
    return handleSupabaseError(error, `addChapter (Novel ID: ${novelId})`);
  }
}

export async function updateChapter(
  novelId: number, // Though not strictly needed for update if chapterId is unique, good for namespacing/auth
  chapterId: number,
  updateData: Partial<Omit<Chapter, 'id' | 'novel_id' | 'created_at' | 'updated_at'>>
): Promise<boolean> {
  if (isNaN(chapterId) || chapterId <= 0) {
    console.error('[api.updateChapter] Invalid chapter ID:', chapterId);
    return false;
  }
  const cleanData = { ...updateData };
  delete (cleanData as any).created_at; // Ensure timestamp isn't included
  delete (cleanData as any).updated_at;
  if (Object.keys(cleanData).length === 0) {
    console.warn("[api.updateChapter] called with empty data.");
    return true;
  }
  try {
    console.log(`[api.updateChapter] Updating chapter ${chapterId}:`, cleanData);
    const { error } = await supabase
      .from('chapters')
      .update(cleanData)
      .eq('id', chapterId);
      // .eq('novel_id', novelId); // Optional: ensure chapter belongs to novel
    if (error) throw error;
    return true;
  } catch (error) {
    handleSupabaseError(error, `updateChapter (Chapter ID: ${chapterId})`);
    return false;
  }
}

export async function deleteChapter(novelId: number, chapterId: number): Promise<boolean> {
  if (isNaN(novelId) || novelId <= 0 || isNaN(chapterId) || chapterId <= 0) {
    console.error('[api.deleteChapter] Invalid IDs:', { novelId, chapterId });
    return false;
  }
  try {
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

export async function updateAllChaptersLockStatus(novelId: number, isLocked: boolean): Promise<boolean> {
  if (isNaN(novelId) || novelId <= 0) {
    console.error('[api.updateAllChaptersLockStatus] Invalid novel ID:', novelId);
    return false;
  }
  try {
    console.log(`[api.updateAllChaptersLockStatus] Setting novel ${novelId} chapters to is_locked: ${isLocked}`);
    const { error } = await supabase
      .from('chapters')
      .update({ is_locked: isLocked })
      .eq('novel_id', novelId);
    if (error) throw error;
    return true;
  } catch (error) {
    handleSupabaseError(error, `updateAllChaptersLockStatus (Novel ID: ${novelId})`);
    return false;
  }
}


// --- COMMENT FUNCTIONS ---

// Define the type for comments when they include joined profile and chapter/novel context
// This is specifically for getUnapprovedComments which has a complex join
export type AdminCommentView = Comment & {
  profiles: Pick<Profile, 'id' | 'username' | 'display_name' | 'role'> | null;
  chapters: {
    title: string;
    novel_id: number;
    novels: { id: number; title: string } | null;
  } | null;
};

// Type for comments fetched for chapter display (includes basic profile)
export type DisplayComment = Comment & {
  profiles: Pick<Profile, 'id' |'username' | 'display_name' | 'role'> | null;
};

export async function getChapterComments(
  chapterId: number,
  page: number = 1,
  pageSize: number = 15
): Promise<{ comments: DisplayComment[]; totalCount: number } | null> {
  if (isNaN(chapterId) || chapterId <= 0 || page < 1 || pageSize < 1) {
    console.error('[api.getChapterComments] Invalid params:', { chapterId, page, pageSize });
    return null;
  }
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  try {
    const { data, error, count } = await supabase
      .from('comments')
      .select(COMMENT_SELECT_FIELDS, { count: 'exact' }) // Uses the updated COMMENT_SELECT_FIELDS
      .eq('chapter_id', chapterId)
      .is('parent_comment_id', null) // Only top-level comments for now
      .eq('is_approved', true)
      .order('created_at', { ascending: true }) // Or false for newest first
      .range(from, to);

    if (error) throw error;
    return { comments: (data as DisplayComment[]) || [], totalCount: count ?? 0 };
  } catch (err) {
    handleSupabaseError(err, `getChapterComments (Chapter ID: ${chapterId}, Page: ${page})`);
    return null;
  }
}

export async function addComment(
  userId: string, // user_id is now mandatory
  chapterId: number,
  content: string,
  parentCommentId: number | null = null
): Promise<Comment | null> { // Returns base Comment type, profile data can be fetched if needed or comes from context
  if (!userId || isNaN(chapterId) || chapterId <= 0 || !content.trim()) {
    console.error('[api.addComment] Invalid input:', { userId, chapterId, content });
    return null;
  }
  try {
    // is_approved is handled by DB trigger for admins, defaults to false for others
    const { data: insertedComment, error: insertError } = await supabase
      .from('comments')
      .insert({
        user_id: userId,
        chapter_id: chapterId,
        content: content.trim(),
        parent_comment_id: parentCommentId,
      })
      .select() // Select basic comment fields
      .single();

    if (insertError) throw insertError;
    if (!insertedComment) {
      console.error('[api.addComment] Insert succeeded but no data returned.');
      return null;
    }
    // The returned comment won't have profile data unless we re-select with join,
    // but the DB trigger handles is_approved.
    // For immediate display, client might use optimistic update with known profile data.
    return insertedComment as Comment;
  } catch (error) {
    return handleSupabaseError(error, `addComment (Chapter ID: ${chapterId})`);
  }
}

export async function deleteComment(commentId: number): Promise<boolean> {
  if (isNaN(commentId) || commentId <= 0) {
    console.error('[api.deleteComment] Invalid comment ID:', commentId);
    return false;
  }
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
export async function getUnapprovedComments(): Promise<AdminCommentView[]> {
  try {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        id, created_at, updated_at, user_id, chapter_id, parent_comment_id, content, is_approved,
        profiles ( id, username, display_name, role ),
        chapters (
          title,
          novel_id,
          novels ( id, title )
        )
      `)
      .eq('is_approved', false)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[api.getUnapprovedComments] Supabase error:', error);
      throw error;
    }
    return (data || []) as AdminCommentView[];
  } catch (error) {
    handleSupabaseError(error, 'getUnapprovedComments');
    return [];
  }
}

export async function approveComment(commentId: number): Promise<boolean> {
  if (isNaN(commentId) || commentId <= 0) {
    console.error('[api.approveComment] Invalid comment ID:', commentId);
    return false;
  }
  try {
    const { error } = await supabase
      .from('comments')
      .update({ is_approved: true, updated_at: new Date().toISOString() })
      .eq('id', commentId);
    if (error) throw error;
    return true;
  } catch (error) {
    handleSupabaseError(error, `approveComment (Comment ID: ${commentId})`);
    return false;
  }
}