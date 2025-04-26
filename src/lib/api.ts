// src/lib/api.ts
import { supabase } from './supabase';
import type { Novel, Chapter, NovelType, ChapterType, Comment, Profile } from '@/types/supabase';
import { PostgrestError } from '@supabase/supabase-js';

// Type guard for PostgrestError
function isPostgrestError(error: any): error is PostgrestError {
  return error && typeof error.message === 'string' && typeof error.code === 'string';
}

// Error handling utility with improved logging
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
  return null;
}

// Common select fields
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

// --- Novel and Chapter Functions ---
export async function searchNovels(query: string): Promise<Novel[]> {
  try {
    const sanitizedQuery = query.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim();
    if (!sanitizedQuery) return [];
    const { data, error } = await supabase
      .from('novels')
      .select(NOVEL_SELECT)
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
     console.error('Invalid novel ID requested:', id);
     return null;
  }
  try {
    const { data, error } = await supabase.from('novels').select(NOVEL_SELECT).eq('id', id).single();
    if (error) {
      if (error.code === 'PGRST116') { console.log(`Novel with ID ${id} not found.`); return null; }
      throw error;
    }
    return data as Novel || null;
  } catch (error) {
    return handleSupabaseError(error, `getNovelMetadata (ID: ${id})`);
  }
}

export async function getNovelChapters(novelId: number): Promise<ChapterType[]> {
  if (isNaN(novelId) || novelId <= 0) {
    console.error('Invalid novel ID for fetching chapters:', novelId);
    return [];
  }
  try {
    const { data, error } = await supabase
      .from('chapters')
      .select(CHAPTER_SELECT)
      .eq('novel_id', novelId)
      .order('chapter_number', { ascending: true });
    if (error) throw error;
    return (data as ChapterType[]) || [];
  } catch (error) {
    return handleSupabaseError(error, `getNovelChapters (Novel ID: ${novelId})`) ?? [];
  }
}

export async function getChapter(novelId: number, chapterNumber: number): Promise<ChapterType | null> {
   if (isNaN(novelId) || novelId <= 0 || isNaN(chapterNumber) || chapterNumber <= 0) {
     console.error('Invalid novel or chapter ID requested:', { novelId, chapterNumber });
     return null;
  }
  try {
    const { data, error } = await supabase
      .from('chapters')
      .select(CHAPTER_SELECT)
      .eq('novel_id', novelId)
      .eq('chapter_number', chapterNumber)
      .single();
    if (error) {
       if (error.code === 'PGRST116') { console.log(`Chapter number ${chapterNumber} for novel ${novelId} not found.`); return null; }
       throw error;
    }
    return data as ChapterType || null;
  } catch (error) {
    return handleSupabaseError(error, `getChapter (Novel: ${novelId}, Chapter: ${chapterNumber})`);
  }
}

export async function deleteChapter(novelId: number, chapterId: number): Promise<boolean> {
   if (isNaN(novelId) || novelId <= 0 || isNaN(chapterId) || chapterId <= 0) {
     console.error('Invalid novel or chapter ID for deletion:', { novelId, chapterId });
     return false;
  }
  try {
    const { error } = await supabase.from('chapters').delete().eq('id', chapterId).eq('novel_id', novelId);
    if (error) throw error;
    return true;
  } catch (error) {
    handleSupabaseError(error, `deleteChapter (Chapter ID: ${chapterId})`);
    return false;
  }
}

export async function addChapter(novelId: number, chapterData: Partial<ChapterType>): Promise<ChapterType | null> {
   if (isNaN(novelId) || novelId <= 0) { console.error('Invalid novel ID for adding chapter:', novelId); return null; }
  if (!chapterData.chapter_number || chapterData.chapter_number <= 0) { console.error('Invalid chapter number provided for addChapter:', chapterData.chapter_number); return null; }
  try {
    const { data, error } = await supabase
      .from('chapters')
      .insert({ ...chapterData, novel_id: novelId })
      .select(CHAPTER_SELECT)
      .single();
    if (error) throw error;
    return data as ChapterType || null;
  } catch (error) {
    return handleSupabaseError(error, `addChapter (Novel ID: ${novelId})`);
  }
}

export async function updateChapter(novelId: number, chapterId: number, updateData: Partial<Omit<ChapterType, 'id' | 'novel_id' | 'created_at'>>): Promise<boolean> {
  if (isNaN(novelId) || novelId <= 0 || isNaN(chapterId) || chapterId <= 0) { console.error('Invalid novel or chapter ID for update:', { novelId, chapterId }); return false; }
  const cleanData = { ...updateData };
  if (Object.keys(cleanData).length === 0) { console.warn("updateChapter called with empty data."); return true; }
  try {
    const { error } = await supabase.from('chapters').update(cleanData).eq('id', chapterId).eq('novel_id', novelId);
    if (error) throw error;
    return true;
  } catch (error) {
    handleSupabaseError(error, `updateChapter (Chapter ID: ${chapterId})`);
    return false;
  }
}

export async function updateAllChaptersLockStatus(novelId: number, isLocked: boolean): Promise<boolean> {
  if (isNaN(novelId) || novelId <= 0) { console.error('Invalid novel ID for bulk update:', novelId); return false; }
  try {
    const { error } = await supabase.from('chapters').update({ is_locked: isLocked }).eq('novel_id', novelId);
    if (error) throw error;
    return true;
  } catch (error) {
    handleSupabaseError(error, `updateAllChaptersLockStatus (Novel ID: ${novelId})`);
    return false;
  }
}

// --- COMMENT FUNCTIONS ---

export async function getChapterComments(chapterId: number): Promise<Comment[]> {
  if (isNaN(chapterId) || chapterId <= 0) { console.error('Invalid chapter ID for fetching comments:', chapterId); return []; }
  try {
    const { data, error } = await supabase
      .from('comments')
      .select(COMMENT_SELECT)
      .eq('chapter_id', chapterId)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // FIX: More robust handling of joined 'profiles' data
    const commentsWithCorrectProfileType = (data || []).map((c: any) => { // Use 'any' temporarily for flexibility
      let profileData: Pick<Profile, 'username' | 'is_guest'> | null = null;
      // Check if profiles exists and is an object (expected case)
      if (c.profiles && typeof c.profiles === 'object' && !Array.isArray(c.profiles)) {
        profileData = { username: c.profiles.username, is_guest: c.profiles.is_guest };
      }
      // Optional: Handle if Supabase unexpectedly returns an array
      // else if (Array.isArray(c.profiles) && c.profiles.length > 0) {
      //   profileData = { username: c.profiles[0].username, is_guest: c.profiles[0].is_guest };
      // }

      return {
        ...c, // Spread the original comment fields
        profiles: profileData // Assign the processed profile data (object or null)
      };
    });

    return commentsWithCorrectProfileType as Comment[]; // Cast the final array
  } catch (error) {
    return handleSupabaseError(error, `getChapterComments (Chapter ID: ${chapterId})`) ?? [];
  }
}

export async function addComment(userId: string, chapterId: number, content: string, parentCommentId: number | null = null): Promise<Comment | null> {
  if (!userId) { console.error('User ID is required to comment.'); return null; }
  if (isNaN(chapterId) || chapterId <= 0) { console.error('Invalid chapter ID for adding comment:', chapterId); return null; }
  if (!content.trim()) { console.error('Comment content cannot be empty.'); return null; }

  try {
    const { data: insertedComment, error: insertError } = await supabase
      .from('comments')
      .insert({ user_id: userId, chapter_id: chapterId, content: content.trim(), parent_comment_id: parentCommentId })
      .select()
      .single();

    if (insertError) throw insertError;
    if (!insertedComment) return null;

    const { data: profileDataResult, error: profileError } = await supabase
        .from('profiles')
        .select('username, is_guest')
        .eq('id', userId)
        .maybeSingle(); // Use maybeSingle to handle profile not found gracefully

     if (profileError) {
         console.error("Error fetching profile for new comment:", profileError);
         // Decide if you want to return null or the comment without profile info
         // return null;
     }

     // Ensure profileDataResult is treated as an object or null
     const profileData = profileDataResult as Pick<Profile, 'username' | 'is_guest'> | null;

    const finalComment: Comment = {
        ...(insertedComment as Omit<Comment, 'profiles'>), // Cast inserted data, excluding profiles
        profiles: profileData ? { username: profileData.username, is_guest: profileData.is_guest } : null,
        // is_approved is handled by DB default, but ensure it's in the type if needed elsewhere
        is_approved: insertedComment.is_approved ?? false
    };

    return finalComment;

  } catch (error) {
    return handleSupabaseError(error, `addComment (Chapter ID: ${chapterId})`);
  }
}


export async function deleteComment(commentId: number): Promise<boolean> {
  if (isNaN(commentId) || commentId <= 0) { console.error('Invalid comment ID for deletion:', commentId); return false; }
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

     // FIX: More robust handling of joined data structures
     const commentsWithContext = (data || []).map((c: any) => { // Use any temporarily
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
                title: c.chapters.title,
                novel_id: c.chapters.novel_id,
                novels: novelDataProcessed
            };
        }

        // Remove the original potentially problematic joined fields before spreading
        const { profiles, chapters, ...baseComment } = c;

        return {
            ...baseComment, // Spread the base comment fields
            profiles: profileData, // Assign processed profile data
            chapters: chapterDataProcessed // Assign processed chapter/novel data
        };
    });

    // Cast the final result
    return commentsWithContext as (Comment & { chapters: { title: string, novel_id: number, novels: { title: string, id: number } | null } | null })[];
  } catch (error) {
    return handleSupabaseError(error, 'getUnapprovedComments') ?? [];
  }
}

export async function approveComment(commentId: number): Promise<boolean> {
  if (isNaN(commentId) || commentId <= 0) { console.error('Invalid comment ID for approval:', commentId); return false; }
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
