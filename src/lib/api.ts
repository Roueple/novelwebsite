// src/lib/api.ts
import { supabase } from './supabase';
import type { Database } from '@/types/supabase'; // Direct import of the generated Database type
import type {
  Novel, // Row type for 'novels'
  Chapter, // Row type for 'chapters'
  Comment, // Row type for 'comments'
  Profile, // Row type for 'profiles'
  UserRole, // Enum type for 'user_role_enum'
} from '@/types'; // Assuming your src/types/index.ts correctly re-exports these based on supabase.ts
import { PostgrestError } from '@supabase/supabase-js';

// Type Aliases from your Database schema for clarity within this file
type DbNovel = Database['public']['Tables']['novels']['Row'];
type DbChapter = Database['public']['Tables']['chapters']['Row'];
type DbChapterInsert = Database['public']['Tables']['chapters']['Insert'];
type DbChapterUpdate = Database['public']['Tables']['chapters']['Update'];
type DbComment = Database['public']['Tables']['comments']['Row'];
type DbCommentInsert = Database['public']['Tables']['comments']['Insert'];
type DbProfile = Database['public']['Tables']['profiles']['Row'];
type DbUserRole = Database['public']['Enums']['user_role_enum'];


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

// Common select fields - ensure these match your desired output and schema
const NOVEL_SELECT_FIELDS = `
  id, title, cover_url, author, author_id, rating, status, tags, description, created_at, updated_at,
  is_hidden, like_count, view_count
`; // Matches DbNovel fields

const CHAPTER_META_SELECT_FIELDS = `
  id, novel_id, chapter_number, title, is_locked, newly_created, created_at, updated_at
`; // Matches DbChapter fields (metadata)

const CHAPTER_FULL_SELECT_FIELDS = `
  id, novel_id, chapter_number, title, content, is_locked, newly_created, created_at, updated_at
`; // Matches DbChapter fields (full)

const COMMENT_SELECT_FIELDS = `
  id, created_at, updated_at, user_id, chapter_id, parent_comment_id, content, is_approved,
  profiles ( id, username, display_name, role )
`; // Assumes 'profiles' table can be joined and has these fields. Based on your supabase.ts, this is correct.


// --- Novel Functions ---
export async function searchNovels(query: string): Promise<DbNovel[]> {
  try {
    const sanitizedQuery = query.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim();
    if (!sanitizedQuery) return [];
    const { data, error } = await supabase
      .from('novels')
      .select(NOVEL_SELECT_FIELDS)
      .or(`title.ilike.%${sanitizedQuery}%,author.ilike.%${sanitizedQuery}%,description.ilike.%${sanitizedQuery}%`)
      .order('updated_at', { ascending: false }) // Assuming updated_at is not null for active novels
      .limit(50);
    if (error) throw error;
    return (data as DbNovel[]) || [];
  } catch (error) {
    return handleSupabaseError(error, 'searchNovels') ?? [];
  }
}

export async function getLatestNovels(limit = 20): Promise<DbNovel[]> {
  try {
    const { data, error } = await supabase
      .from('novels')
      .select(NOVEL_SELECT_FIELDS)
      .order('created_at', { ascending: false }) // Assuming created_at is not null
      .limit(limit);
    if (error) throw error;
    return (data as DbNovel[]) || [];
  } catch (error) {
    return handleSupabaseError(error, 'getLatestNovels') ?? [];
  }
}

export async function getNovel(id: number): Promise<DbNovel | null> {
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
    if (error && error.code === 'PGRST116') { // Standard "No rows found"
      console.log(`[api.getNovel] Novel with ID ${id} not found.`);
      return null;
    }
    if (error) throw error;
    return data as DbNovel || null;
  } catch (error) {
    return handleSupabaseError(error, `getNovel (ID: ${id})`);
  }
}

export async function updateNovelDetails(
  novelId: number,
  updateData: Partial<Omit<DbNovel, 'id' | 'created_at' | 'updated_at'>> // Use Omit on DbNovel
): Promise<boolean> {
  if (isNaN(novelId) || novelId <= 0) {
    console.error('[api.updateNovelDetails] Invalid novel ID:', novelId);
    return false;
  }

  // Construct the update object safely, aligning with DbNovel Update type
  const dataToUpdate: Database['public']['Tables']['novels']['Update'] = { ...updateData };

  // Remove fields that should not be directly updated or are managed by DB
  delete dataToUpdate.id; // Should not be in Partial anyway due to Omit
  delete dataToUpdate.created_at;
  // updated_at will be set by Supabase or trigger, or manually below if needed

  if (Object.keys(dataToUpdate).length === 0) {
    console.warn("[api.updateNovelDetails] called with empty data.");
    return true; // Or false, depending on desired behavior for no-op
  }

  // Explicitly set updated_at
  dataToUpdate.updated_at = new Date().toISOString();

  try {
    console.log(`[api.updateNovelDetails] Updating novel ${novelId}:`, dataToUpdate);
    const { error } = await supabase
      .from('novels')
      .update(dataToUpdate)
      .eq('id', novelId);
    if (error) throw error;
    return true;
  } catch (error) {
    handleSupabaseError(error, `updateNovelDetails (Novel ID: ${novelId})`);
    return false;
  }
}


// --- Chapter Functions ---
export async function getNovelChapters(novelId: number): Promise<DbChapter[]> {
  if (isNaN(novelId) || novelId <= 0) {
    console.error('[api.getNovelChapters] Invalid novel ID:', novelId);
    return [];
  }
  try {
    const { data, error } = await supabase
      .from('chapters')
      .select(CHAPTER_META_SELECT_FIELDS) // Metadata only
      .eq('novel_id', novelId)
      .order('chapter_number', { ascending: true });
    if (error) throw error;
    return (data as DbChapter[]) || [];
  } catch (error) {
    return handleSupabaseError(error, `getNovelChapters (Novel ID: ${novelId})`) ?? [];
  }
}

// Helper to get a user's role directly from DB - useful for server-side checks or specific API contexts
async function getUserRoleFromDB(userId: string): Promise<DbUserRole | null> {
  if (!userId) {
    console.warn('[api.getUserRoleFromDB] No userId provided.');
    return null;
  }
  try {
    const { data: profileData, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (error && error.code === 'PGRST116') { // No profile found
      console.warn(`[api.getUserRoleFromDB] Profile not found for user ${userId}.`);
      return null;
    }
    if (error) throw error; // Other errors
    return profileData?.role || null;
  } catch (err) {
    return handleSupabaseError(err, `getUserRoleFromDB for ${userId}`);
  }
}

export async function getChapter(
  novelId: number,
  chapterNumber: number,
  requestingUserId: string | null // ID of the user making the request
): Promise<DbChapter | null> { // Returns full chapter row, content might be null
  if (isNaN(novelId) || novelId <= 0 || isNaN(chapterNumber) || chapterNumber <= 0) {
    console.error('[api.getChapter] Invalid novel or chapter identifier:', { novelId, chapterNumber });
    return null;
  }
  console.log(`[api.getChapter] Fetching chapter ${chapterNumber} for novel ${novelId}, user: ${requestingUserId || 'Guest'}`);
  try {
    const { data: chapterData, error } = await supabase
      .from('chapters')
      .select(CHAPTER_FULL_SELECT_FIELDS) // Fetches content field
      .eq('novel_id', novelId)
      .eq('chapter_number', chapterNumber)
      .single();

    if (error && error.code === 'PGRST116') {
      console.log(`[api.getChapter] Chapter ${chapterNumber} for novel ${novelId} not found.`);
      return null;
    }
    if (error) throw error;
    if (!chapterData) return null; // Should be caught by PGRST116, but defensive

    const typedChapter = chapterData as DbChapter;

    if (!typedChapter.is_locked) {
      return typedChapter; // Unlocked, return full content
    }

    // Chapter IS locked, check authorization
    if (requestingUserId) {
      const userRole = await getUserRoleFromDB(requestingUserId);
      if (userRole === 'admin') {
        console.log(`[api.getChapter] Admin ${requestingUserId} authorized for locked chapter ${typedChapter.id}.`);
        return typedChapter; // Admin sees full content
      }
    }

    // Not an admin (or not logged in) and chapter is locked
    console.log(`[api.getChapter] User ${requestingUserId || 'Guest'} NOT authorized for locked chapter ${typedChapter.id}.`);
    return { ...typedChapter, content: null }; // Return metadata, but content is nulled out

  } catch (err) {
    return handleSupabaseError(err, `getChapter (Novel: ${novelId}, Chapter: ${chapterNumber})`);
  }
}

export async function addChapter(
  novelId: number,
  chapterDataInput: Pick<DbChapterInsert, 'chapter_number' | 'title' | 'content' | 'is_locked' | 'newly_created'>
): Promise<DbChapter | null> {
  if (isNaN(novelId) || novelId <= 0) {
    console.error('[api.addChapter] Invalid novel ID:', novelId);
    return null;
  }
  if (!chapterDataInput.chapter_number || chapterDataInput.chapter_number <= 0) {
    console.error('[api.addChapter] Invalid chapter number:', chapterDataInput.chapter_number);
    return null;
  }

  const insertPayload: DbChapterInsert = {
    ...chapterDataInput,
    novel_id: novelId, // novel_id is 'number | null' in Insert, ensure novelId is valid
    // created_at and updated_at will be set by DB
  };

  try {
    const { data, error } = await supabase
      .from('chapters')
      .insert(insertPayload)
      .select(CHAPTER_FULL_SELECT_FIELDS) // Select full chapter data after insert
      .single();
    if (error) throw error;
    return data as DbChapter || null;
  } catch (error) {
    return handleSupabaseError(error, `addChapter (Novel ID: ${novelId})`);
  }
}

export async function updateChapter(
  chapterId: number,
  updateData: Partial<Pick<DbChapterUpdate, 'title' | 'content' | 'is_locked' | 'chapter_number' | 'newly_created'>>
): Promise<boolean> {
  if (isNaN(chapterId) || chapterId <= 0) {
    console.error('[api.updateChapter] Invalid chapter ID:', chapterId);
    return false;
  }

  const dataToUpdate: DbChapterUpdate = {};
  if (updateData.title !== undefined) dataToUpdate.title = updateData.title;
  if (updateData.content !== undefined) dataToUpdate.content = updateData.content;
  if (updateData.is_locked !== undefined) dataToUpdate.is_locked = updateData.is_locked;
  if (updateData.chapter_number !== undefined) dataToUpdate.chapter_number = updateData.chapter_number;
  if (updateData.newly_created !== undefined) dataToUpdate.newly_created = updateData.newly_created;

  if (Object.keys(dataToUpdate).length === 0) {
    console.warn("[api.updateChapter] called with effectively empty data.");
    return true; // No operation needed, considered success
  }

  dataToUpdate.updated_at = new Date().toISOString(); // Manage updated_at timestamp

  try {
    console.log(`[api.updateChapter] Updating chapter ${chapterId}:`, dataToUpdate);
    const { error } = await supabase
      .from('chapters')
      .update(dataToUpdate)
      .eq('id', chapterId);
    if (error) {
        console.error('[api.updateChapter] Supabase error:', error);
        throw error;
    }
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
      .eq('novel_id', novelId); // Ensure deleting from correct novel
    if (error) throw error;
    return true;
  } catch (error) {
    handleSupabaseError(error, `deleteChapter (Chapter ID: ${chapterId}, Novel ID: ${novelId})`);
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
      .update({ is_locked: isLocked, updated_at: new Date().toISOString() })
      .eq('novel_id', novelId);
    if (error) throw error;
    return true;
  } catch (error) {
    handleSupabaseError(error, `updateAllChaptersLockStatus (Novel ID: ${novelId})`);
    return false;
  }
}


// --- COMMENT FUNCTIONS ---

// Type for comments when they include joined profile and chapter/novel context
// This is specifically for getUnapprovedComments which has a complex join
export type AdminCommentView = DbComment & { // Base is DbComment now
  profiles: Pick<DbProfile, 'id' | 'username' | 'display_name' | 'role'> | null;
  chapters: {
    title: string;
    novel_id: number; // Assuming chapters.novel_id is not null for a comment context
    novels: { id: number; title: string } | null; // novels can be null if join fails
  } | null; // chapters can be null if join fails
};

// Type for comments fetched for chapter display (includes basic profile)
export type DisplayComment = DbComment & { // Base is DbComment
  profiles: Pick<DbProfile, 'id' |'username' | 'display_name' | 'role'> | null;
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
      .select(COMMENT_SELECT_FIELDS, { count: 'exact' })
      .eq('chapter_id', chapterId)
      .is('parent_comment_id', null) // Only top-level comments
      .eq('is_approved', true)
      .order('created_at', { ascending: true }) // Oldest first for typical comment threads
      .range(from, to);
    if (error) throw error;
    return { comments: (data as DisplayComment[]) || [], totalCount: count ?? 0 };
  } catch (err) {
    handleSupabaseError(err, `getChapterComments (Chapter ID: ${chapterId}, Page: ${page})`);
    return null;
  }
}

export async function addComment(
  userId: string,
  chapterId: number,
  content: string,
  parentCommentId: number | null = null
): Promise<DbComment | null> {
  if (!userId || isNaN(chapterId) || chapterId <= 0 || !content.trim()) {
    console.error('[api.addComment] Invalid input:', { userId, chapterId, content });
    return null;
  }

  const insertPayload: DbCommentInsert = {
    user_id: userId,
    chapter_id: chapterId,
    content: content.trim(),
    parent_comment_id: parentCommentId,
    // is_approved defaults to false (or handled by DB trigger for admins)
    // created_at, updated_at are handled by DB
  };

  try {
    const { data: insertedComment, error: insertError } = await supabase
      .from('comments')
      .insert(insertPayload)
      .select() // Select basic comment fields
      .single();

    if (insertError) throw insertError;
    if (!insertedComment) {
      console.error('[api.addComment] Insert succeeded but no data returned.');
      return null;
    }
    return insertedComment as DbComment;
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
      .order('created_at', { ascending: true }); // Show oldest unapproved first
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