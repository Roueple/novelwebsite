// src/lib/api.ts
import { supabase } from './supabase';
import type { Novel, Chapter, NovelType, ChapterType, Comment, Profile } from '@/types/supabase';
import { PostgrestError } from '@supabase/supabase-js';

// Type guard for PostgrestError
function isPostgrestError(error: any): error is PostgrestError {
  return error && typeof error.message === 'string' && typeof error.code === 'string';
}

// Error handling utility
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
  // Consider logging to an external service in production
  return null;
}


// Common select fields
const NOVEL_SELECT = `
  id, title, cover_url, author, author_id, rating, status, tags, description, created_at, updated_at
`;
const CHAPTER_SELECT = `
  id, novel_id, chapter_number, title, content, is_locked, newly_created, created_at, updated_at
`;
// *** NEW: Specific select string for chapter lists (excludes 'content') ***
const CHAPTER_LIST_SELECT = `
  id, novel_id, chapter_number, title, is_locked, created_at, updated_at
`;
const COMMENT_SELECT = `
  id, created_at, updated_at, user_id, chapter_id, parent_comment_id, content, is_approved,
  profiles ( username, is_guest )
`;

// --- Novel Functions --- (No changes needed here)
export async function searchNovels(query: string): Promise<Novel[]> {
  try {
    const sanitizedQuery = query.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim();
    if (!sanitizedQuery) return [];

    const { data, error } = await supabase
      .from('novels')
      .select(NOVEL_SELECT)
      .or(
        `title.ilike.%${sanitizedQuery}%,author.ilike.%${sanitizedQuery}%,description.ilike.%${sanitizedQuery}%`
      )
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
      .select(NOVEL_SELECT)
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
        .select(NOVEL_SELECT)
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


// --- Chapter Functions ---

// *** MODIFIED: Fetch only necessary fields for the chapter list ***
export async function getNovelChapters(novelId: number): Promise<ChapterType[]> {
  if (isNaN(novelId) || novelId <= 0) {
    console.error('[api.getNovelChapters] Invalid novel ID:', novelId);
    return [];
  }
  try {
    console.log(`[api.getNovelChapters] Fetching chapter list for novel ID: ${novelId} using CHAPTER_LIST_SELECT`);
    const { data, error } = await supabase
      .from('chapters')
      .select(CHAPTER_LIST_SELECT) // *** CHANGED: Use specific list select ***
      .eq('novel_id', novelId)
      .order('chapter_number', { ascending: true });

    if (error) throw error;
    // Note: 'content' will be null/undefined for these ChapterType objects, which is intended here.
    return (data as ChapterType[]) || [];
  } catch (error) {
    return handleSupabaseError(error, `getNovelChapters (Novel ID: ${novelId})`) ?? [];
  }
}

// *** UNCHANGED: getChapter still fetches full content ***
export async function getChapter(novelId: number, chapterNumber: number): Promise<ChapterType | null> {
   if (isNaN(novelId) || novelId <= 0 || isNaN(chapterNumber) || chapterNumber <= 0) {
     console.error('[api.getChapter] Invalid novel or chapter ID requested:', { novelId, chapterNumber });
     return null;
  }
  try {
    const { data, error } = await supabase
      .from('chapters')
      .select(CHAPTER_SELECT) // *** Keep CHAPTER_SELECT here ***
      .eq('novel_id', novelId)
      .eq('chapter_number', chapterNumber)
      .single();

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

// *** UNCHANGED: deleteChapter ***
export async function deleteChapter(novelId: number, chapterId: number): Promise<boolean> {
   if (isNaN(novelId) || novelId <= 0 || isNaN(chapterId) || chapterId <= 0) {
     console.error('[api.deleteChapter] Invalid novel or chapter ID for deletion:', { novelId, chapterId });
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

// *** UNCHANGED: addChapter (still selects full chapter after insert) ***
export async function addChapter(novelId: number, chapterData: Partial<ChapterType>): Promise<ChapterType | null> {
   if (isNaN(novelId) || novelId <= 0) { console.error('[api.addChapter] Invalid novel ID:', novelId); return null; }
  if (!chapterData.chapter_number || chapterData.chapter_number <= 0) { console.error('[api.addChapter] Invalid chapter number provided:', chapterData.chapter_number); return null; }
  try {
    const { data, error } = await supabase
      .from('chapters')
      .insert({ ...chapterData, novel_id: novelId })
      .select(CHAPTER_SELECT) // Selects the full new chapter data
      .single();
    if (error) throw error;
    return data as ChapterType || null;
  } catch (error) {
    return handleSupabaseError(error, `addChapter (Novel ID: ${novelId})`);
  }
}

// *** UNCHANGED: updateChapter ***
export async function updateChapter(novelId: number, chapterId: number, updateData: Partial<Omit<ChapterType, 'id' | 'novel_id' | 'created_at'>>): Promise<boolean> {
  if (isNaN(novelId) || novelId <= 0 || isNaN(chapterId) || chapterId <= 0) { console.error('[api.updateChapter] Invalid novel or chapter ID for update:', { novelId, chapterId }); return false; }

  const cleanData = { ...updateData };
  if (Object.keys(cleanData).length === 0) { console.warn("[api.updateChapter] called with empty data."); return true; }

  try {
    console.log(`[api.updateChapter] Updating chapter ${chapterId} with data:`, cleanData);
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

// *** UNCHANGED: updateAllChaptersLockStatus ***
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

// --- COMMENT FUNCTIONS --- (No changes needed here)

export async function getChapterComments(
  chapterId: number,
  page: number = 1,
  pageSize: number = 15 // Default page size
): Promise<{ comments: Comment[]; totalCount: number } | null> {
  if (isNaN(chapterId) || chapterId <= 0) {
    console.error('[api.getChapterComments] Invalid chapter ID:', chapterId);
    return null;
  }
  if (page < 1 || pageSize < 1) {
    console.error('[api.getChapterComments] Invalid pagination parameters:', { page, pageSize });
    return null;
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  try {
    const { data, error, count } = await supabase
      .from('comments')
      .select(COMMENT_SELECT, { count: 'exact' })
      .eq('chapter_id', chapterId)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: true })
      .range(from, to);

    if (error) throw error;

    const commentsWithCorrectProfileType = (data || []).map((c: any) => {
      let profileData: Pick<Profile, 'username' | 'is_guest'> | null = null;
      if (c.profiles && typeof c.profiles === 'object' && !Array.isArray(c.profiles)) {
        profileData = { username: c.profiles.username, is_guest: c.profiles.is_guest };
      }
      const { profiles, ...baseComment } = c;
      return { ...baseComment, profiles: profileData };
    });

    return {
        comments: commentsWithCorrectProfileType as Comment[],
        totalCount: count ?? 0
    };
  } catch (error) {
    handleSupabaseError(error, `getChapterComments (Chapter ID: ${chapterId}, Page: ${page})`);
    return null;
  }
}

export async function addComment(userId: string, chapterId: number, content: string, parentCommentId: number | null = null): Promise<Comment | null> {
  console.log(`[api.addComment] Attempting insert: userId=${userId}, chapterId=${chapterId}`);
  if (!userId) { console.error('[api.addComment] User ID is required.'); return null; }
  if (isNaN(chapterId) || chapterId <= 0) { console.error('[api.addComment] Invalid chapter ID:', chapterId); return null; }
  if (!content.trim()) { console.error('[api.addComment] Comment content cannot be empty.'); return null; }

  try {
    console.log('[api.addComment] Inserting comment data...');
    const { data: insertedComment, error: insertError } = await supabase
      .from('comments')
      .insert({ user_id: userId, chapter_id: chapterId, content: content.trim(), parent_comment_id: parentCommentId })
      .select()
      .single();
    if (insertError) {
        console.error('[api.addComment] Supabase insert error:', insertError);
        throw insertError;
    }
    if (!insertedComment) {
        console.error('[api.addComment] Insert succeeded but no data returned.');
        return null;
    }
    console.log('[api.addComment] Insert successful, comment ID:', insertedComment.id);
    console.log(`[api.addComment] Fetching profile for userId: ${userId}`);
    const { data: profileDataResult, error: profileError } = await supabase
        .from('profiles')
        .select('username, is_guest')
        .eq('id', userId)
        .maybeSingle();

     if (profileError) {
         console.error("[api.addComment] Error fetching profile for new comment:", profileError);
     } else {
          console.log("[api.addComment] Profile fetch successful:", profileDataResult);
     }

     const profileData = profileDataResult as Pick<Profile, 'username' | 'is_guest'> | null;

    const finalComment: Comment = {
        ...(insertedComment as Omit<Comment, 'profiles'>),
        profiles: profileData ? { username: profileData.username, is_guest: profileData.is_guest } : null,
        is_approved: insertedComment.is_approved ?? false
    };
    console.log("[api.addComment] Successfully constructed final comment object:", finalComment);
    return finalComment;

  } catch (error) {
    console.error(`[api.addComment] Caught error during comment addition for chapter ${chapterId}:`, error);
    return handleSupabaseError(error, `addComment (Chapter ID: ${chapterId})`);
  }
}

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

// --- ADMIN MODERATION FUNCTIONS --- (No changes needed here)

export async function getUnapprovedComments(): Promise<(Comment & { chapters: { title: string, novel_id: number, novels: { title: string, id: number } | null } | null })[]> {
   try {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        ${COMMENT_SELECT},
        chapters ( title, novel_id, novels ( title, id ) )
      `)
      .eq('is_approved', false)
      .order('created_at', { ascending: true });

    if (error) throw error;
     const commentsWithContext = (data || []).map((c: any) => {
        let profileData: Pick<Profile, 'username' | 'is_guest'> | null = null;
        if (c.profiles && typeof c.profiles === 'object' && !Array.isArray(c.profiles)) {
            profileData = { username: c.profiles.username, is_guest: c.profiles.is_guest };
        }
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
        const { profiles, chapters, ...baseComment } = c;
        return { ...baseComment, profiles: profileData, chapters: chapterDataProcessed };
    });
    return commentsWithContext as (Comment & { chapters: { title: string, novel_id: number, novels: { title: string, id: number } | null } | null })[];
   } catch (error) {
    return handleSupabaseError(error, 'getUnapprovedComments') ?? [];
   }
}

export async function approveComment(commentId: number): Promise<boolean> {
   if (isNaN(commentId) || commentId <= 0) { console.error('[api.approveComment] Invalid comment ID:', commentId); return false; }
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