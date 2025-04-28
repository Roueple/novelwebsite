// src/lib/api.ts
import { supabase } from './supabase';
import type { Novel, Chapter, NovelType, ChapterType, Comment, Profile } from '@/types/supabase'; // [cite: 1800]
import { PostgrestError } from '@supabase/supabase-js';

// Type guard for PostgrestError (Keep as is)
function isPostgrestError(error: any): error is PostgrestError {
  return error && typeof error.message === 'string' && typeof error.code === 'string'; // [cite: 1801]
}

// Error handling utility with improved logging (Keep as is)
function handleSupabaseError(error: unknown, context: string): null {
  let message = 'An unknown error occurred'; // [cite: 1802]
  if (isPostgrestError(error)) {
    message = `Supabase Error (${context}): ${error.message} (Code: ${error.code})`; // [cite: 1803]
    console.error(message, { details: error.details, hint: error.hint }); // [cite: 1803]
  } else if (error instanceof Error) {
    message = `Error (${context}): ${error.message}`; // [cite: 1804]
    console.error(message, error.stack); // [cite: 1804]
  } else {
     console.error(`Unknown Error (${context}):`, error); // [cite: 1805]
  }
  return null; // [cite: 1806]
}


// Common select fields (Keep as is)
const NOVEL_SELECT = `
  id, title, cover_url, author, author_id, rating, status, tags, description, created_at, updated_at
`; // [cite: 1807]
const CHAPTER_SELECT = `
  id, novel_id, chapter_number, title, content, is_locked, newly_created, created_at, updated_at
`; // [cite: 1808]
const COMMENT_SELECT = `
  id, created_at, updated_at, user_id, chapter_id, parent_comment_id, content, is_approved,
  profiles ( username, is_guest )
`; // [cite: 1809]

// --- Novel Functions --- (Keep as is)
export async function searchNovels(query: string): Promise<Novel[]> {
  try {
    const sanitizedQuery = query.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim(); // [cite: 1812]
    if (!sanitizedQuery) return []; // [cite: 1812]

    const { data, error } = await supabase
      .from('novels')
      .select(NOVEL_SELECT)
      .or(
        `title.ilike.%${sanitizedQuery}%,author.ilike.%${sanitizedQuery}%,description.ilike.%${sanitizedQuery}%`
      )
      .order('updated_at', { ascending: false })
      .limit(50); // [cite: 1813]

    if (error) throw error; // [cite: 1814]
    return data || []; // [cite: 1815]
  } catch (error) {
    return handleSupabaseError(error, 'searchNovels') ?? []; // [cite: 1816]
  }
}

export async function getLatestNovels(limit = 20): Promise<Novel[]> {
  try {
    const { data, error } = await supabase
      .from('novels')
      .select(NOVEL_SELECT)
      .order('created_at', { ascending: false })
      .limit(limit); // [cite: 1819]
    if (error) throw error; // [cite: 1819]
    return data || []; // [cite: 1820]
  } catch (error) {
    return handleSupabaseError(error, 'getLatestNovels') ?? []; // [cite: 1820]
  }
}

export async function getNovel(id: number): Promise<Novel | null> {
  if (isNaN(id) || id <= 0) {
     console.error('[api.getNovel] Invalid novel ID requested:', id); // [cite: 1823]
     return null; // [cite: 1823]
  }
  try {
    const { data, error } = await supabase
        .from('novels')
        .select(NOVEL_SELECT)
        .eq('id', id)
        .single(); // [cite: 1824]
    if (error && error.code === 'PGRST116') {
        console.log(`[api.getNovel] Novel with ID ${id} not found.`); // [cite: 1825]
        return null; // [cite: 1825]
    }
    if (error) throw error; // [cite: 1826]

    return data as Novel || null; // [cite: 1827]
  } catch (error) {
    return handleSupabaseError(error, `getNovel (ID: ${id})`); // [cite: 1828]
  }
}


// --- Chapter Functions --- (Keep as is)
export async function getNovelChapters(novelId: number): Promise<ChapterType[]> {
  if (isNaN(novelId) || novelId <= 0) {
    console.error('[api.getNovelChapters] Invalid novel ID:', novelId); // [cite: 1831]
    return []; // [cite: 1831]
  }
  try {
    const { data, error } = await supabase
      .from('chapters')
      .select(CHAPTER_SELECT)
      .eq('novel_id', novelId)
      .order('chapter_number', { ascending: true }); // [cite: 1832]
    if (error) throw error; // [cite: 1832]
    return (data as ChapterType[]) || []; // [cite: 1833]
  } catch (error) {
    return handleSupabaseError(error, `getNovelChapters (Novel ID: ${novelId})`) ?? []; // [cite: 1834]
  }
}

export async function getChapter(novelId: number, chapterNumber: number): Promise<ChapterType | null> {
   if (isNaN(novelId) || novelId <= 0 || isNaN(chapterNumber) || chapterNumber <= 0) {
     console.error('[api.getChapter] Invalid novel or chapter ID requested:', { novelId, chapterNumber }); // [cite: 1838]
     return null; // [cite: 1838]
  }
  try {
    const { data, error } = await supabase
      .from('chapters')
      .select(CHAPTER_SELECT)
      .eq('novel_id', novelId)
      .eq('chapter_number', chapterNumber)
      .single(); // [cite: 1839]

    if (error && error.code === 'PGRST116') {
       console.log(`[api.getChapter] Chapter number ${chapterNumber} for novel ${novelId} not found.`); // [cite: 1840]
       return null; // [cite: 1840]
    }
    if (error) throw error; // [cite: 1841]

    return data as ChapterType || null; // [cite: 1841]
  } catch (error) {
    return handleSupabaseError(error, `getChapter (Novel: ${novelId}, Chapter: ${chapterNumber})`); // [cite: 1841]
  }
}

export async function deleteChapter(novelId: number, chapterId: number): Promise<boolean> {
   if (isNaN(novelId) || novelId <= 0 || isNaN(chapterId) || chapterId <= 0) {
     console.error('[api.deleteChapter] Invalid novel or chapter ID for deletion:', { novelId, chapterId }); // [cite: 1846]
     return false; // [cite: 1846]
  }
  try {
    const { error } = await supabase
        .from('chapters')
        .delete()
        .eq('id', chapterId)
        .eq('novel_id', novelId); // [cite: 1847]
    if (error) throw error; // [cite: 1847]
    return true; // [cite: 1847]
  } catch (error) {
    handleSupabaseError(error, `deleteChapter (Chapter ID: ${chapterId})`); // [cite: 1848]
    return false; // [cite: 1848]
  }
}

export async function addChapter(novelId: number, chapterData: Partial<ChapterType>): Promise<ChapterType | null> {
   if (isNaN(novelId) || novelId <= 0) { console.error('[api.addChapter] Invalid novel ID:', novelId); // [cite: 1852]
   return null; } // [cite: 1852]
  if (!chapterData.chapter_number || chapterData.chapter_number <= 0) { console.error('[api.addChapter] Invalid chapter number provided:', chapterData.chapter_number); return null; // [cite: 1853]
  }
  try {
    const { data, error } = await supabase
      .from('chapters')
      .insert({ ...chapterData, novel_id: novelId }) // [cite: 1854]
      .select(CHAPTER_SELECT) // [cite: 1854]
      .single(); // [cite: 1854]
    if (error) throw error; // [cite: 1854]
    return data as ChapterType || null; // [cite: 1855]
  } catch (error) {
    return handleSupabaseError(error, `addChapter (Novel ID: ${novelId})`); // [cite: 1855]
  }
}

export async function updateChapter(novelId: number, chapterId: number, updateData: Partial<Omit<ChapterType, 'id' | 'novel_id' | 'created_at'>>): Promise<boolean> {
  if (isNaN(novelId) || novelId <= 0 || isNaN(chapterId) || chapterId <= 0) { console.error('[api.updateChapter] Invalid novel or chapter ID for update:', { novelId, chapterId }); // [cite: 1861]
  return false; } // [cite: 1861]

  const cleanData = { ...updateData }; // [cite: 1862]
  if (Object.keys(cleanData).length === 0) { console.warn("[api.updateChapter] called with empty data."); return true; // [cite: 1863]
  }

  try {
    console.log(`[api.updateChapter] Updating chapter ${chapterId} with data:`, cleanData); // [cite: 1864]
    const { error } = await supabase
        .from('chapters')
        .update(cleanData)
        .eq('id', chapterId)
        .eq('novel_id', novelId); // [cite: 1865]
    if (error) throw error; // [cite: 1865]
    return true; // [cite: 1866]
  } catch (error) {
    handleSupabaseError(error, `updateChapter (Chapter ID: ${chapterId})`); // [cite: 1866]
    return false; // [cite: 1866]
  }
}

export async function updateAllChaptersLockStatus(novelId: number, isLocked: boolean): Promise<boolean> {
  if (isNaN(novelId) || novelId <= 0) { console.error('[api.updateAllChaptersLockStatus] Invalid novel ID:', novelId); // [cite: 1870]
  return false; } // [cite: 1870]
  try {
    console.log(`[api.updateAllChaptersLockStatus] Setting all chapters for novel ${novelId} to is_locked: ${isLocked}`); // [cite: 1871]
    const { error } = await supabase
        .from('chapters')
        .update({ is_locked: isLocked })
        .eq('novel_id', novelId); // [cite: 1872]
    if (error) throw error; // [cite: 1872]
    console.log(`[api.updateAllChaptersLockStatus] Bulk update successful for novel ${novelId}.`); // [cite: 1872]
    return true; // [cite: 1873]
  } catch (error) {
    handleSupabaseError(error, `updateAllChaptersLockStatus (Novel ID: ${novelId})`); // [cite: 1873]
    return false; // [cite: 1874]
  }
}

// --- COMMENT FUNCTIONS ---

/**
 * **MODIFIED FOR PAGINATION**
 * Fetches comments for a specific chapter, paginated.
 * RLS policy automatically filters based on approval status for non-admins.
 * Includes commenter's username and guest status.
 * @param chapterId - The ID of the chapter.
 * @param page - The page number to fetch (1-indexed).
 * @param pageSize - The number of comments per page.
 * @returns A promise resolving to an object containing comments for the page and the total count, or null on error.
 */
export async function getChapterComments(
  chapterId: number,
  page: number = 1,
  pageSize: number = 15 // Default page size
): Promise<{ comments: Comment[]; totalCount: number } | null> {
  if (isNaN(chapterId) || chapterId <= 0) {
    console.error('[api.getChapterComments] Invalid chapter ID:', chapterId); // [cite: 1878]
    return null;
  }
  if (page < 1 || pageSize < 1) {
    console.error('[api.getChapterComments] Invalid pagination parameters:', { page, pageSize });
    return null;
  }

  // Calculate offset for Supabase range
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  try {
    // Fetch comments for the specific range and the total count
    const { data, error, count } = await supabase
      .from('comments')
      .select(COMMENT_SELECT, { count: 'exact' }) // Request total count
      .eq('chapter_id', chapterId)
      .is('parent_comment_id', null) // Fetch only top-level comments
      .order('created_at', { ascending: true }) // Oldest first
      .range(from, to); // Apply pagination range

    if (error) throw error; // [cite: 1880]

    const commentsWithCorrectProfileType = (data || []).map((c: any) => {
      let profileData: Pick<Profile, 'username' | 'is_guest'> | null = null;
      if (c.profiles && typeof c.profiles === 'object' && !Array.isArray(c.profiles)) {
        profileData = { username: c.profiles.username, is_guest: c.profiles.is_guest };
      }
      const { profiles, ...baseComment } = c; // [cite: 1881]
      return { ...baseComment, profiles: profileData };
    }); // [cite: 1882]

    return {
        comments: commentsWithCorrectProfileType as Comment[],
        totalCount: count ?? 0 // Supabase returns count if 'exact' is specified
    };
  } catch (error) {
    // Return null on error, consistent with other functions
    handleSupabaseError(error, `getChapterComments (Chapter ID: ${chapterId}, Page: ${page})`);
    return null;
  }
}


// --- Rest of the API functions (addComment, deleteComment, admin functions) remain the same ---

export async function addComment(userId: string, chapterId: number, content: string, parentCommentId: number | null = null): Promise<Comment | null> {
  console.log(`[api.addComment] Attempting insert: userId=${userId}, chapterId=${chapterId}`); // [cite: 1890]
  if (!userId) { console.error('[api.addComment] User ID is required.'); return null; // [cite: 1891]
  }
  if (isNaN(chapterId) || chapterId <= 0) { console.error('[api.addComment] Invalid chapter ID:', chapterId); return null; // [cite: 1892]
  }
  if (!content.trim()) { console.error('[api.addComment] Comment content cannot be empty.'); return null; // [cite: 1893]
  }

  try {
    console.log('[api.addComment] Inserting comment data...'); // [cite: 1894]
    const { data: insertedComment, error: insertError } = await supabase
      .from('comments')
      .insert({ user_id: userId, chapter_id: chapterId, content: content.trim(), parent_comment_id: parentCommentId })
      .select() // Select the basic inserted row
      .single(); // [cite: 1895]
    if (insertError) {
        console.error('[api.addComment] Supabase insert error:', insertError); // [cite: 1895]
        throw insertError; // [cite: 1896]
    }
    if (!insertedComment) {
        console.error('[api.addComment] Insert succeeded but no data returned.'); // [cite: 1897]
        return null; // [cite: 1897]
    }
    console.log('[api.addComment] Insert successful, comment ID:', insertedComment.id); // [cite: 1898]
    console.log(`[api.addComment] Fetching profile for userId: ${userId}`); // [cite: 1899]
    const { data: profileDataResult, error: profileError } = await supabase
        .from('profiles')
        .select('username, is_guest')
        .eq('id', userId)
        .maybeSingle(); // [cite: 1900]

     if (profileError) {
         console.error("[api.addComment] Error fetching profile for new comment:", profileError); // [cite: 1901]
     } else {
          console.log("[api.addComment] Profile fetch successful:", profileDataResult); // [cite: 1902]
     }

     const profileData = profileDataResult as Pick<Profile, 'username' | 'is_guest'> | null; // [cite: 1903]

    const finalComment: Comment = {
        ...(insertedComment as Omit<Comment, 'profiles'>), // [cite: 1904]
        profiles: profileData ? { username: profileData.username, is_guest: profileData.is_guest } : null, // [cite: 1904]
        is_approved: insertedComment.is_approved ?? false // [cite: 1905]
    };
    console.log("[api.addComment] Successfully constructed final comment object:", finalComment); // [cite: 1906]
    return finalComment; // [cite: 1906]

  } catch (error) {
    console.error(`[api.addComment] Caught error during comment addition for chapter ${chapterId}:`, error); // [cite: 1907]
    return handleSupabaseError(error, `addComment (Chapter ID: ${chapterId})`); // [cite: 1907]
  }
}

export async function deleteComment(commentId: number): Promise<boolean> {
   if (isNaN(commentId) || commentId <= 0) { console.error('[api.deleteComment] Invalid comment ID:', commentId); // [cite: 1911]
   return false; } // [cite: 1911]
  try {
    const { error } = await supabase.from('comments').delete().eq('id', commentId); // [cite: 1912]
    if (error) throw error; // [cite: 1912]
    return true; // [cite: 1912]
  } catch (error) {
    handleSupabaseError(error, `deleteComment (Comment ID: ${commentId})`); // [cite: 1913]
    return false; // [cite: 1913]
  }
}

// --- ADMIN MODERATION FUNCTIONS ---

export async function getUnapprovedComments(): Promise<(Comment & { chapters: { title: string, novel_id: number, novels: { title: string, id: number } | null } | null })[]> {
   try {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        ${COMMENT_SELECT},
        chapters ( title, novel_id, novels ( title, id ) )
      `) // [cite: 1916]
      .eq('is_approved', false) // [cite: 1916]
      .order('created_at', { ascending: true }); // [cite: 1917]

    if (error) throw error; // [cite: 1918]
     const commentsWithContext = (data || []).map((c: any) => {
        let profileData: Pick<Profile, 'username' | 'is_guest'> | null = null;
        if (c.profiles && typeof c.profiles === 'object' && !Array.isArray(c.profiles)) {
            profileData = { username: c.profiles.username, is_guest: c.profiles.is_guest };
        } // [cite: 1919]
        let chapterDataProcessed: { title: string; novel_id: number; novels: { title: string; id: number; } | null; } | null = null;
        if (c.chapters && typeof c.chapters === 'object' && !Array.isArray(c.chapters)) {
            let novelDataProcessed: { title: string; id: number; } | null = null;
            if (c.chapters.novels && typeof c.chapters.novels === 'object' && !Array.isArray(c.chapters.novels)) {
                 novelDataProcessed = { title: c.chapters.novels.title, id: c.chapters.novels.id }; // [cite: 1920]
            }
            chapterDataProcessed = {
                title: c.chapters.title, novel_id: c.chapters.novel_id, novels: novelDataProcessed
            }; // [cite: 1921]
        }
        const { profiles, chapters, ...baseComment } = c; // [cite: 1922]
        return { ...baseComment, profiles: profileData, chapters: chapterDataProcessed }; // [cite: 1922]
    }); // [cite: 1923]
    return commentsWithContext as (Comment & { chapters: { title: string, novel_id: number, novels: { title: string, id: number } | null } | null })[]; // [cite: 1924]
   } catch (error) {
    return handleSupabaseError(error, 'getUnapprovedComments') ?? []; // [cite: 1925]
   }
}

export async function approveComment(commentId: number): Promise<boolean> {
   if (isNaN(commentId) || commentId <= 0) { console.error('[api.approveComment] Invalid comment ID:', commentId); // [cite: 1929]
   return false; } // [cite: 1929]
  try {
    const { error } = await supabase
      .from('comments')
      .update({ is_approved: true, updated_at: new Date().toISOString() }) // [cite: 1930]
      .eq('id', commentId); // [cite: 1930]
    if (error) throw error; // [cite: 1930]
    return true; // [cite: 1930]
  } catch (error) {
    handleSupabaseError(error, `approveComment (Comment ID: ${commentId})`); // [cite: 1931]
    return false; // [cite: 1931]
  }
}