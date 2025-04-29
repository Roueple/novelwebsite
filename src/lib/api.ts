// src/lib/api.ts
import { supabase } from './supabase';
// Ensure UserRole is imported from your types
import type { Novel, Chapter, NovelType, ChapterType, Comment, Profile, UserRole } from '@/types/supabase';
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
// Specific select string for chapter lists (excludes 'content')
const CHAPTER_LIST_SELECT = `
  id, novel_id, chapter_number, title, is_locked, created_at, updated_at
`;
const COMMENT_SELECT = `
  id, created_at, updated_at, user_id, chapter_id, parent_comment_id, content, is_approved,
  profiles ( username, is_guest )
`;

// --- Novel Functions --- (Keep existing code)
export async function searchNovels(query: string): Promise<Novel[]> {
  try {
    const sanitizedQuery = query.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim();
    if (!sanitizedQuery) return [];
    const { data, error } = await supabase.from('novels').select(NOVEL_SELECT).or(`title.ilike.%${sanitizedQuery}%,author.ilike.%${sanitizedQuery}%,description.ilike.%${sanitizedQuery}%`).order('updated_at', { ascending: false }).limit(50);
    if (error) throw error; return data || [];
  } catch (error) { return handleSupabaseError(error, 'searchNovels') ?? []; }
}
export async function getLatestNovels(limit = 20): Promise<Novel[]> {
  try {
    const { data, error } = await supabase.from('novels').select(NOVEL_SELECT).order('created_at', { ascending: false }).limit(limit);
    if (error) throw error; return data || [];
  } catch (error) { return handleSupabaseError(error, 'getLatestNovels') ?? []; }
}
export async function getNovel(id: number): Promise<Novel | null> {
  if (isNaN(id) || id <= 0) { console.error('[api.getNovel] Invalid novel ID requested:', id); return null; }
  try {
    const { data, error } = await supabase.from('novels').select(NOVEL_SELECT).eq('id', id).single();
    if (error && error.code === 'PGRST116') { console.log(`[api.getNovel] Novel with ID ${id} not found.`); return null; }
    if (error) throw error; return data as Novel || null;
  } catch (error) { return handleSupabaseError(error, `getNovel (ID: ${id})`); }
}

// --- Chapter Functions ---

// Helper function to check authorization
async function isUserAuthorizedForChapter(userId: string | null, chapter: ChapterType): Promise<boolean> {
    if (!userId) { return !chapter.is_locked; } // Anonymous users can only see unlocked chapters
    // Check admin role
    try {
        const { data: profile, error } = await supabase.from('profiles').select('role').eq('id', userId).single();
        if (error && error.code !== 'PGRST116') throw error;
        if (profile?.role === 'admin') return true; // Admin sees all
    } catch (error) { handleSupabaseError(error, `isUserAuthorizedForChapter profile check (User ID: ${userId})`); return false; }
    // Placeholder for subscription check
    const hasActiveSubscription = false; // Replace with actual check
    if (chapter.is_locked && hasActiveSubscription) return true;
    // Deny if locked and no other authorization matched
    if (chapter.is_locked) return false;
    // Allow access if chapter is not locked
    return true;
}

// Fetches chapter list (metadata only)
export async function getNovelChapters(novelId: number): Promise<ChapterType[]> {
  if (isNaN(novelId) || novelId <= 0) { console.error('[api.getNovelChapters] Invalid novel ID:', novelId); return []; }
  try {
    const { data, error } = await supabase.from('chapters').select(CHAPTER_LIST_SELECT).eq('novel_id', novelId).order('chapter_number', { ascending: true });
    if (error) throw error; return (data as ChapterType[]) || [];
  } catch (error) { return handleSupabaseError(error, `getNovelChapters (Novel ID: ${novelId})`) ?? []; }
}

// *** MODIFIED getChapter function ***
export async function getChapter(
    novelId: number,
    chapterNumber: number,
    requestingUserId: string | null
): Promise<ChapterType | null> {
    if (isNaN(novelId) || novelId <= 0 || isNaN(chapterNumber) || chapterNumber <= 0) {
        console.error('[api.getChapter] Invalid novel or chapter ID requested:', { novelId, chapterNumber });
        return null;
    }
    console.log(`[api.getChapter] Fetching chapter ${chapterNumber} for novel ${novelId}, requested by user: ${requestingUserId || 'Anonymous'}`);
    try {
        const { data, error } = await supabase.from('chapters').select(CHAPTER_SELECT).eq('novel_id', novelId).eq('chapter_number', chapterNumber).single();
        if (error && error.code === 'PGRST116') { console.log(`[api.getChapter] Chapter number ${chapterNumber} for novel ${novelId} not found.`); return null; }
        if (error) throw error; if (!data) return null;

        // Explicitly cast the fetched data to ChapterType
        const chapterData = data as ChapterType;

        // Authorization Check
        const authorized = await isUserAuthorizedForChapter(requestingUserId, chapterData);

        if (chapterData.is_locked && !authorized) {
            console.log(`[api.getChapter] User ${requestingUserId || 'Anonymous'} NOT authorized for locked chapter ${chapterData.id}. Returning content as null.`);
            // *FIX*: Explicitly cast the returned object to ChapterType to satisfy TypeScript
            return { ...chapterData, content: null } as ChapterType; // <-- Cast added here
        }

        // Authorized or not locked: Return full data
        console.log(`[api.getChapter] Access granted for chapter ${chapterData.id}. Returning full content.`);
        return chapterData; // This is already ChapterType

    } catch (error) {
        return handleSupabaseError(error, `getChapter (Novel: ${novelId}, Chapter: ${chapterNumber})`);
    }
}

// --- Other Chapter Functions (Keep existing code) ---
export async function deleteChapter(novelId: number, chapterId: number): Promise<boolean> {
   if (isNaN(novelId) || novelId <= 0 || isNaN(chapterId) || chapterId <= 0) { console.error('[api.deleteChapter] Invalid IDs:', { novelId, chapterId }); return false; }
   try { const { error } = await supabase.from('chapters').delete().eq('id', chapterId).eq('novel_id', novelId); if (error) throw error; return true; }
   catch (error) { handleSupabaseError(error, `deleteChapter (Chapter ID: ${chapterId})`); return false; }
}
export async function addChapter(novelId: number, chapterData: Partial<ChapterType>): Promise<ChapterType | null> {
   if (isNaN(novelId) || novelId <= 0) { console.error('[api.addChapter] Invalid novel ID:', novelId); return null; }
   if (!chapterData.chapter_number || chapterData.chapter_number <= 0) { console.error('[api.addChapter] Invalid chapter number:', chapterData.chapter_number); return null; }
   try { const { data, error } = await supabase.from('chapters').insert({ ...chapterData, novel_id: novelId }).select(CHAPTER_SELECT).single(); if (error) throw error; return data as ChapterType || null; }
   catch (error) { return handleSupabaseError(error, `addChapter (Novel ID: ${novelId})`); }
}
export async function updateChapter(novelId: number, chapterId: number, updateData: Partial<Omit<ChapterType, 'id' | 'novel_id' | 'created_at'>>): Promise<boolean> {
   if (isNaN(novelId) || novelId <= 0 || isNaN(chapterId) || chapterId <= 0) { console.error('[api.updateChapter] Invalid IDs:', { novelId, chapterId }); return false; }
   const cleanData = { ...updateData }; if (Object.keys(cleanData).length === 0) { console.warn("[api.updateChapter] called with empty data."); return true; }
   try { console.log(`[api.updateChapter] Updating chapter ${chapterId}:`, cleanData); const { error } = await supabase.from('chapters').update(cleanData).eq('id', chapterId).eq('novel_id', novelId); if (error) throw error; return true; }
   catch (error) { handleSupabaseError(error, `updateChapter (Chapter ID: ${chapterId})`); return false; }
}
export async function updateAllChaptersLockStatus(novelId: number, isLocked: boolean): Promise<boolean> {
   if (isNaN(novelId) || novelId <= 0) { console.error('[api.updateAllChaptersLockStatus] Invalid novel ID:', novelId); return false; }
   try { console.log(`[api.updateAllChaptersLockStatus] Setting novel ${novelId} chapters to is_locked: ${isLocked}`); const { error } = await supabase.from('chapters').update({ is_locked: isLocked }).eq('novel_id', novelId); if (error) throw error; return true; }
   catch (error) { handleSupabaseError(error, `updateAllChaptersLockStatus (Novel ID: ${novelId})`); return false; }
}

// --- COMMENT FUNCTIONS --- (Keep existing code)
export async function getChapterComments(chapterId: number, page: number = 1, pageSize: number = 15): Promise<{ comments: Comment[]; totalCount: number } | null> {
  if (isNaN(chapterId) || chapterId <= 0 || page < 1 || pageSize < 1) { console.error('[api.getChapterComments] Invalid params:', { chapterId, page, pageSize }); return null; }
  const from = (page - 1) * pageSize; const to = from + pageSize - 1;
  try {
    const { data, error, count } = await supabase.from('comments').select(COMMENT_SELECT, { count: 'exact' }).eq('chapter_id', chapterId).is('parent_comment_id', null).eq('is_approved', true).order('created_at', { ascending: true }).range(from, to);
    if (error) throw error;
    const commentsWithCorrectProfileType = (data || []).map((c: any) => { let profileData: Pick<Profile, 'username' | 'is_guest'> | null = null; if (c.profiles && typeof c.profiles === 'object' && !Array.isArray(c.profiles)) { profileData = { username: c.profiles.username, is_guest: c.profiles.is_guest }; } const { profiles, ...baseComment } = c; return { ...baseComment, profiles: profileData }; });
    return { comments: commentsWithCorrectProfileType as Comment[], totalCount: count ?? 0 };
  } catch (error) { handleSupabaseError(error, `getChapterComments (Chapter ID: ${chapterId}, Page: ${page})`); return null; }
}
export async function addComment(userId: string, chapterId: number, content: string, parentCommentId: number | null = null): Promise<Comment | null> {
  if (!userId || isNaN(chapterId) || chapterId <= 0 || !content.trim()) { console.error('[api.addComment] Invalid input:', { userId, chapterId, content }); return null; }
  try {
    const { data: insertedComment, error: insertError } = await supabase.from('comments').insert({ user_id: userId, chapter_id: chapterId, content: content.trim(), parent_comment_id: parentCommentId }).select().single();
    if (insertError) throw insertError; if (!insertedComment) { console.error('[api.addComment] Insert succeeded but no data returned.'); return null; }
    const { data: profileDataResult, error: profileError } = await supabase.from('profiles').select('username, is_guest').eq('id', userId).maybeSingle();
    if (profileError) { console.error("[api.addComment] Error fetching profile for new comment:", profileError); }
    const profileData = profileDataResult as Pick<Profile, 'username' | 'is_guest'> | null;
    const finalComment: Comment = { ...(insertedComment as Omit<Comment, 'profiles'>), profiles: profileData ? { username: profileData.username, is_guest: profileData.is_guest } : null, is_approved: insertedComment.is_approved ?? false };
    return finalComment;
  } catch (error) { return handleSupabaseError(error, `addComment (Chapter ID: ${chapterId})`); }
}
export async function deleteComment(commentId: number): Promise<boolean> {
   if (isNaN(commentId) || commentId <= 0) { console.error('[api.deleteComment] Invalid comment ID:', commentId); return false; }
   try { const { error } = await supabase.from('comments').delete().eq('id', commentId); if (error) throw error; return true; }
   catch (error) { handleSupabaseError(error, `deleteComment (Comment ID: ${commentId})`); return false; }
}

// --- ADMIN MODERATION FUNCTIONS --- (Keep existing code)
export async function getUnapprovedComments(): Promise<(Comment & { chapters: { title: string, novel_id: number, novels: { title: string, id: number } | null } | null })[]> {
   try {
    const { data, error } = await supabase.from('comments').select(`id,created_at,updated_at,user_id,chapter_id,parent_comment_id,content,is_approved,profiles(username,is_guest),chapters(title,novel_id,novels(title,id))`).eq('is_approved', false).order('created_at', { ascending: true });
    if (error) throw error;
    const commentsWithContext = (data || []).map((c: any) => { let profileData: Pick<Profile, 'username' | 'is_guest'> | null = null; if (c.profiles && typeof c.profiles === 'object' && !Array.isArray(c.profiles)) { profileData = { username: c.profiles.username, is_guest: c.profiles.is_guest }; } let chapterDataProcessed: { title: string; novel_id: number; novels: { title: string; id: number; } | null; } | null = null; if (c.chapters && typeof c.chapters === 'object' && !Array.isArray(c.chapters)) { let novelDataProcessed: { title: string; id: number; } | null = null; if (c.chapters.novels && typeof c.chapters.novels === 'object' && !Array.isArray(c.chapters.novels)) { novelDataProcessed = { title: c.chapters.novels.title, id: c.chapters.novels.id }; } chapterDataProcessed = { title: c.chapters.title, novel_id: c.chapters.novel_id, novels: novelDataProcessed }; } const { profiles, chapters, ...baseComment } = c; return { ...baseComment, profiles: profileData, chapters: chapterDataProcessed }; });
    return commentsWithContext as (Comment & { chapters: { title: string, novel_id: number, novels: { title: string, id: number } | null } | null })[];
  } catch (error) { return handleSupabaseError(error, 'getUnapprovedComments') ?? []; }
}
export async function approveComment(commentId: number): Promise<boolean> {
   if (isNaN(commentId) || commentId <= 0) { console.error('[api.approveComment] Invalid comment ID:', commentId); return false; }
   try { const { error } = await supabase.from('comments').update({ is_approved: true, updated_at: new Date().toISOString() }).eq('id', commentId); if (error) throw error; return true; }
   catch (error) { handleSupabaseError(error, `approveComment (Comment ID: ${commentId})`); return false; }
}