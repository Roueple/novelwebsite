// src/lib/api.ts
import { supabase } from './supabase';
// Ensure UserRole is imported from your types
import type { Novel, Chapter, NovelType, ChapterType, Comment, Profile, UserRole } from '@/types/supabase'; // [cite: 1849]
import { PostgrestError } from '@supabase/supabase-js'; // [cite: 1849]

// Type guard for PostgrestError
function isPostgrestError(error: any): error is PostgrestError { // [cite: 1849]
  return error && typeof error.message === 'string' && typeof error.code === 'string'; // [cite: 1850]
} // [cite: 1850]

// Error handling utility
function handleSupabaseError(error: unknown, context: string): null { // [cite: 1850]
  let message = 'An unknown error occurred'; // [cite: 1850]
  if (isPostgrestError(error)) { // [cite: 1851]
    message = `Supabase Error (${context}): ${error.message} (Code: ${error.code})`; // [cite: 1852]
    console.error(message, { details: error.details, hint: error.hint }); // [cite: 1852]
  } else if (error instanceof Error) { // [cite: 1852]
    message = `Error (${context}): ${error.message}`; // [cite: 1853]
    console.error(message, error.stack); // [cite: 1853]
  } else { // [cite: 1853]
     console.error(`Unknown Error (${context}):`, error); // [cite: 1854]
  } // [cite: 1854]
  // Consider logging to an external service in production
  return null; // [cite: 1855]
} // [cite: 1855]

// Common select fields
const NOVEL_SELECT = `
  id, title, cover_url, author, author_id, rating, status, tags, description, created_at, updated_at
`; // [cite: 1855]
const CHAPTER_SELECT = `
  id, novel_id, chapter_number, title, content, is_locked, newly_created, created_at, updated_at
`; // [cite: 1856]
// Specific select string for chapter lists (excludes 'content')
const CHAPTER_LIST_SELECT = `
  id, novel_id, chapter_number, title, is_locked, created_at, updated_at
`; // [cite: 1857]
const COMMENT_SELECT = `
  id, created_at, updated_at, user_id, chapter_id, parent_comment_id, content, is_approved,
  profiles ( username, is_guest )
`; // [cite: 1858]

// --- Novel Functions --- (No changes from previous versions)
export async function searchNovels(query: string): Promise<Novel[]> { // [cite: 1859]
  try { // [cite: 1859]
    const sanitizedQuery = query.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim(); // [cite: 1860]
    if (!sanitizedQuery) return []; // [cite: 1860]
    const { data, error } = await supabase.from('novels').select(NOVEL_SELECT).or(`title.ilike.%${sanitizedQuery}%,author.ilike.%${sanitizedQuery}%,description.ilike.%${sanitizedQuery}%`).order('updated_at', { ascending: false }).limit(50); // [cite: 1860]
    if (error) throw error; // [cite: 1860]
    return data || []; // [cite: 1861]
  } catch (error) { return handleSupabaseError(error, 'searchNovels') ?? []; // [cite: 1861]
  } // [cite: 1862]
} // [cite: 1862]
export async function getLatestNovels(limit = 20): Promise<Novel[]> { // [cite: 1862]
  try { // [cite: 1862]
    const { data, error } = await supabase.from('novels').select(NOVEL_SELECT).order('created_at', { ascending: false }).limit(limit); // [cite: 1863]
    if (error) throw error; return data || []; // [cite: 1863]
  } catch (error) { return handleSupabaseError(error, 'getLatestNovels') ?? []; // [cite: 1863]
  } // [cite: 1864]
} // [cite: 1864]
export async function getNovel(id: number): Promise<Novel | null> { // [cite: 1864]
  if (isNaN(id) || id <= 0) { console.error('[api.getNovel] Invalid novel ID requested:', id); // [cite: 1864]
    return null; } // [cite: 1865]
  try { // [cite: 1865]
    const { data, error } = await supabase.from('novels').select(NOVEL_SELECT).eq('id', id).single(); // [cite: 1866]
    if (error && error.code === 'PGRST116') { console.log(`[api.getNovel] Novel with ID ${id} not found.`); return null; // [cite: 1866]
    } // [cite: 1867]
    if (error) throw error; return data as Novel || null; // [cite: 1867]
  } catch (error) { return handleSupabaseError(error, `getNovel (ID: ${id})`); } // [cite: 1868]
} // [cite: 1868]

// --- Chapter Functions ---

// Helper function to check authorization (No change needed in this helper itself)
async function isUserAuthorizedForChapter(userId: string | null, chapter: ChapterType): Promise<boolean> { // [cite: 1868]
    if (!userId) { return !chapter.is_locked; // [cite: 1868]
    } // Anonymous users can only see unlocked chapters // [cite: 1869]
    // Check admin role
    try { // [cite: 1869]
        const { data: profile, error } = await supabase.from('profiles').select('role').eq('id', userId).single(); // [cite: 1869]
        if (error && error.code !== 'PGRST116') throw error; // [cite: 1870]
        if (profile?.role === 'admin') return true; // [cite: 1870]
    // Admin sees all // [cite: 1871]
    } catch (error) { handleSupabaseError(error, `isUserAuthorizedForChapter profile check (User ID: ${userId})`); return false; // [cite: 1871]
    } // [cite: 1872]
    // Placeholder for subscription check
    const hasActiveSubscription = false; // [cite: 1872]
    // Replace with actual check // [cite: 1873]
    if (chapter.is_locked && hasActiveSubscription) return true; // [cite: 1873]
    // Deny if locked and no other authorization matched // [cite: 1874]
    if (chapter.is_locked) return false; // [cite: 1874]
    // Allow access if chapter is not locked // [cite: 1875]
    return true; // [cite: 1876]
} // [cite: 1876]

// Fetches chapter list (metadata only) (No change)
export async function getNovelChapters(novelId: number): Promise<ChapterType[]> { // [cite: 1876]
  if (isNaN(novelId) || novelId <= 0) { console.error('[api.getNovelChapters] Invalid novel ID:', novelId); // [cite: 1876]
    return []; } // [cite: 1877]
  try { // [cite: 1877]
    const { data, error } = await supabase.from('chapters').select(CHAPTER_LIST_SELECT).eq('novel_id', novelId).order('chapter_number', { ascending: true }); // [cite: 1877]
    if (error) throw error; return (data as ChapterType[]) || []; // [cite: 1878]
  } catch (error) { return handleSupabaseError(error, `getNovelChapters (Novel ID: ${novelId})`) ?? []; // [cite: 1879]
  } // [cite: 1880]
} // [cite: 1880]

// *** MODIFIED getChapter function ***
export async function getChapter(
    novelId: number,
    chapterNumber: number,
    requestingUserId: string | null
): Promise<ChapterType | null> { // [cite: 1881]
    if (isNaN(novelId) || novelId <= 0 || isNaN(chapterNumber) || chapterNumber <= 0) { // [cite: 1881]
        console.error('[api.getChapter] Invalid novel or chapter ID requested:', { novelId, chapterNumber }); // [cite: 1881]
        return null; // [cite: 1882]
    } // [cite: 1882]
    console.log(`[api.getChapter] Fetching chapter ${chapterNumber} for novel ${novelId}, requested by user: ${requestingUserId || 'Anonymous'}`); // [cite: 1882]
    try { // [cite: 1883]
        // Step 1: Fetch the chapter data first
        const { data, error } = await supabase.from('chapters').select(CHAPTER_SELECT).eq('novel_id', novelId).eq('chapter_number', chapterNumber).single(); // [cite: 1883]

        if (error && error.code === 'PGRST116') { console.log(`[api.getChapter] Chapter number ${chapterNumber} for novel ${novelId} not found.`); return null; // [cite: 1884]
        } // [cite: 1885]
        if (error) throw error; if (!data) return null; // [cite: 1885]

        const chapterData = data as ChapterType; // [cite: 1886]

        // Step 2: Check if the chapter is locked
        if (!chapterData.is_locked) {
            // Chapter is NOT locked, return full data immediately, skip auth check
            console.log(`[api.getChapter] Chapter ${chapterData.id} is unlocked. Access granted.`);
            return chapterData;
        }

        // --- Chapter IS locked, proceed with authorization check ---
        console.log(`[api.getChapter] Chapter ${chapterData.id} is LOCKED. Checking authorization for user: ${requestingUserId || 'Anonymous'}`);
        const authorized = await isUserAuthorizedForChapter(requestingUserId, chapterData); // [cite: 1887]

        if (!authorized) { // [cite: 1888]
            // User is NOT authorized for this locked chapter
            console.log(`[api.getChapter] User ${requestingUserId || 'Anonymous'} NOT authorized for locked chapter ${chapterData.id}. Returning content as null.`); // [cite: 1888]
            return { ...chapterData, content: null } as ChapterType; // Return metadata but null content // [cite: 1889]
        } else {
             // User IS authorized for this locked chapter
            console.log(`[api.getChapter] User ${requestingUserId || 'Anonymous'} IS authorized for locked chapter ${chapterData.id}. Returning full content.`);
             return chapterData; // Return full data // [cite: 1891]
        }

    } catch (error) { // [cite: 1891]
        return handleSupabaseError(error, `getChapter (Novel: ${novelId}, Chapter: ${chapterNumber})`); // [cite: 1891]
    } // [cite: 1892]
} // [cite: 1892]

// --- Other Chapter Functions (No changes needed) ---
export async function deleteChapter(novelId: number, chapterId: number): Promise<boolean> { // [cite: 1892]
   if (isNaN(novelId) || novelId <= 0 || isNaN(chapterId) || chapterId <= 0) { console.error('[api.deleteChapter] Invalid IDs:', { novelId, chapterId }); // [cite: 1892]
    return false; } // [cite: 1893]
   try { const { error } = await supabase.from('chapters').delete().eq('id', chapterId).eq('novel_id', novelId); if (error) throw error; // [cite: 1893]
    return true; } // [cite: 1894]
   catch (error) { handleSupabaseError(error, `deleteChapter (Chapter ID: ${chapterId})`); return false; // [cite: 1894]
   } // [cite: 1895]
} // [cite: 1895]
export async function addChapter(novelId: number, chapterData: Partial<ChapterType>): Promise<ChapterType | null> { // [cite: 1895]
   if (isNaN(novelId) || novelId <= 0) { console.error('[api.addChapter] Invalid novel ID:', novelId); // [cite: 1895]
    return null; } // [cite: 1896]
   if (!chapterData.chapter_number || chapterData.chapter_number <= 0) { console.error('[api.addChapter] Invalid chapter number:', chapterData.chapter_number); return null; // [cite: 1896]
   } // [cite: 1897]
   try { const { data, error } = await supabase.from('chapters').insert({ ...chapterData, novel_id: novelId }).select(CHAPTER_SELECT).single(); // [cite: 1897]
    if (error) throw error; return data as ChapterType || null; // [cite: 1898]
   } // [cite: 1899]
   catch (error) { return handleSupabaseError(error, `addChapter (Novel ID: ${novelId})`); // [cite: 1899]
   } // [cite: 1900]
} // [cite: 1900]
export async function updateChapter(novelId: number, chapterId: number, updateData: Partial<Omit<ChapterType, 'id' | 'novel_id' | 'created_at'>>): Promise<boolean> { // [cite: 1900]
   if (isNaN(novelId) || novelId <= 0 || isNaN(chapterId) || chapterId <= 0) { console.error('[api.updateChapter] Invalid IDs:', { novelId, chapterId }); // [cite: 1900]
    return false; } // [cite: 1901]
   const cleanData = { ...updateData }; // [cite: 1901]
   delete (cleanData as any).created_at; // Ensure timestamp isn't included // [cite: 1902]
   if (Object.keys(cleanData).length === 0) { console.warn("[api.updateChapter] called with empty data."); return true; // [cite: 1902]
   } // [cite: 1903]
   try { console.log(`[api.updateChapter] Updating chapter ${chapterId}:`, cleanData); const { error } = await supabase.from('chapters').update(cleanData).eq('id', chapterId).eq('novel_id', novelId); // [cite: 1903]
    if (error) throw error; return true; } // [cite: 1904]
   catch (error) { handleSupabaseError(error, `updateChapter (Chapter ID: ${chapterId})`); return false; // [cite: 1904]
   } // [cite: 1905]
} // [cite: 1905]
export async function updateAllChaptersLockStatus(novelId: number, isLocked: boolean): Promise<boolean> { // [cite: 1905]
   if (isNaN(novelId) || novelId <= 0) { console.error('[api.updateAllChaptersLockStatus] Invalid novel ID:', novelId); // [cite: 1905]
    return false; } // [cite: 1906]
   try { console.log(`[api.updateAllChaptersLockStatus] Setting novel ${novelId} chapters to is_locked: ${isLocked}`); // [cite: 1906]
    const { error } = await supabase.from('chapters').update({ is_locked: isLocked }).eq('novel_id', novelId); if (error) throw error; return true; // [cite: 1907]
   } // [cite: 1908]
   catch (error) { handleSupabaseError(error, `updateAllChaptersLockStatus (Novel ID: ${novelId})`); return false; // [cite: 1908]
   } // [cite: 1909]
} // [cite: 1909]

// --- COMMENT FUNCTIONS --- (No changes)
export async function getChapterComments(chapterId: number, page: number = 1, pageSize: number = 15): Promise<{ comments: Comment[]; totalCount: number } | null> { // [cite: 1910]
  if (isNaN(chapterId) || chapterId <= 0 || page < 1 || pageSize < 1) { console.error('[api.getChapterComments] Invalid params:', { chapterId, page, pageSize }); // [cite: 1910]
    return null; } // [cite: 1911]
  const from = (page - 1) * pageSize; const to = from + pageSize - 1; // [cite: 1911]
  try { // [cite: 1912]
    const { data, error, count } = await supabase.from('comments').select(COMMENT_SELECT, { count: 'exact' }).eq('chapter_id', chapterId).is('parent_comment_id', null).eq('is_approved', true).order('created_at', { ascending: true }).range(from, to); // [cite: 1912]
    if (error) throw error; // [cite: 1913]
    const commentsWithCorrectProfileType = (data || []).map((c: any) => { let profileData: Pick<Profile, 'username' | 'is_guest'> | null = null; if (c.profiles && typeof c.profiles === 'object' && !Array.isArray(c.profiles)) { profileData = { username: c.profiles.username, is_guest: c.profiles.is_guest }; } const { profiles, ...baseComment } = c; return { ...baseComment, profiles: profileData }; }); // [cite: 1913]
    return { comments: commentsWithCorrectProfileType as Comment[], totalCount: count ?? 0 }; // [cite: 1914]
  } catch (error) { handleSupabaseError(error, `getChapterComments (Chapter ID: ${chapterId}, Page: ${page})`); return null; // [cite: 1915]
  } // [cite: 1916]
} // [cite: 1916]
export async function addComment(userId: string, chapterId: number, content: string, parentCommentId: number | null = null): Promise<Comment | null> { // [cite: 1916]
  if (!userId || isNaN(chapterId) || chapterId <= 0 || !content.trim()) { console.error('[api.addComment] Invalid input:', { userId, chapterId, content }); // [cite: 1917]
    return null; } // [cite: 1918]
  try { // [cite: 1918]
    const { data: insertedComment, error: insertError } = await supabase.from('comments').insert({ user_id: userId, chapter_id: chapterId, content: content.trim(), parent_comment_id: parentCommentId }).select().single(); // [cite: 1918]
    if (insertError) throw insertError; if (!insertedComment) { console.error('[api.addComment] Insert succeeded but no data returned.'); return null; // [cite: 1919]
    } // [cite: 1920]
    const { data: profileDataResult, error: profileError } = await supabase.from('profiles').select('username, is_guest').eq('id', userId).maybeSingle(); // [cite: 1920]
    if (profileError) { console.error("[api.addComment] Error fetching profile for new comment:", profileError); // [cite: 1921]
    } // [cite: 1922]
    const profileData = profileDataResult as Pick<Profile, 'username' | 'is_guest'> | null; // [cite: 1922]
    const finalComment: Comment = { ...(insertedComment as Omit<Comment, 'profiles'>), profiles: profileData ? { username: profileData.username, is_guest: profileData.is_guest } : null, is_approved: insertedComment.is_approved ?? false }; // [cite: 1923]
    return finalComment; // [cite: 1925]
  } catch (error) { return handleSupabaseError(error, `addComment (Chapter ID: ${chapterId})`); // [cite: 1925]
  } // [cite: 1926]
} // [cite: 1926]
export async function deleteComment(commentId: number): Promise<boolean> { // [cite: 1926]
   if (isNaN(commentId) || commentId <= 0) { console.error('[api.deleteComment] Invalid comment ID:', commentId); // [cite: 1926]
    return false; } // [cite: 1927]
   try { const { error } = await supabase.from('comments').delete().eq('id', commentId); if (error) throw error; // [cite: 1927]
    return true; } // [cite: 1928]
   catch (error) { handleSupabaseError(error, `deleteComment (Comment ID: ${commentId})`); return false; // [cite: 1928]
   } // [cite: 1929]
} // [cite: 1929]

// --- ADMIN MODERATION FUNCTIONS --- (No changes)
export async function getUnapprovedComments(): Promise<(Comment & { chapters: { title: string, novel_id: number, novels: { title: string, id: number } | null } | null })[]> { // [cite: 1929]
   try { // [cite: 1929]
    const { data, error } = await supabase.from('comments').select(`id,created_at,updated_at,user_id,chapter_id,parent_comment_id,content,is_approved,profiles(username,is_guest),chapters(title,novel_id,novels(title,id))`).eq('is_approved', false).order('created_at', { ascending: true }); // [cite: 1929]
    if (error) throw error; // [cite: 1930]
    const commentsWithContext = (data || []).map((c: any) => { let profileData: Pick<Profile, 'username' | 'is_guest'> | null = null; if (c.profiles && typeof c.profiles === 'object' && !Array.isArray(c.profiles)) { profileData = { username: c.profiles.username, is_guest: c.profiles.is_guest }; } let chapterDataProcessed: { title: string; novel_id: number; novels: { title: string; id: number; } | null; } | null = null; if (c.chapters && typeof c.chapters === 'object' && !Array.isArray(c.chapters)) { let novelDataProcessed: { title: string; id: number; } | null = null; if (c.chapters.novels && typeof c.chapters.novels === 'object' && !Array.isArray(c.chapters.novels)) { novelDataProcessed = { title: c.chapters.novels.title, id: c.chapters.novels.id }; } chapterDataProcessed = { title: c.chapters.title, novel_id: c.chapters.novel_id, novels: novelDataProcessed }; } const { profiles, chapters, ...baseComment } = c; return { ...baseComment, profiles: profileData, chapters: chapterDataProcessed }; // [cite: 1930]
    }); // [cite: 1932]
    return commentsWithContext as (Comment & { chapters: { title: string, novel_id: number, novels: { title: string, id: number } | null } | null })[]; // [cite: 1932]
   } catch (error) { return handleSupabaseError(error, 'getUnapprovedComments') ?? []; } // [cite: 1933]
} // [cite: 1933]
export async function approveComment(commentId: number): Promise<boolean> { // [cite: 1933]
   if (isNaN(commentId) || commentId <= 0) { console.error('[api.approveComment] Invalid comment ID:', commentId); // [cite: 1933]
    return false; } // [cite: 1934]
   try { const { error } = await supabase.from('comments').update({ is_approved: true, updated_at: new Date().toISOString() }).eq('id', commentId); // [cite: 1934]
    if (error) throw error; return true; } // [cite: 1935]
   catch (error) { handleSupabaseError(error, `approveComment (Comment ID: ${commentId})`); return false; // [cite: 1935]
   } // [cite: 1936]
} // [cite: 1936]