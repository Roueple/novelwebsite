// src/lib/api.ts
import { supabase } from './supabase';
// Import specific types, including Novel without chapters baked in
import type { Novel, Chapter, NovelType, ChapterType } from '@/types/supabase';
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
  // Avoid returning the error object itself to the client-side usually
  return null;
}


// Common select fields
const NOVEL_SELECT = `
  id, title, cover_url, author, author_id, rating, status, tags, description, created_at, updated_at
`;
const CHAPTER_SELECT = `
  id, novel_id, chapter_number, title, content, is_locked, newly_created, created_at, updated_at
`;


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
    handleSupabaseError(error, 'searchNovels');
    return [];
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
    handleSupabaseError(error, 'getLatestNovels');
    return [];
  }
}

// MODIFIED: Fetches only Novel metadata, no chapters
export async function getNovel(id: number): Promise<Novel | null> { // Return type is now Novel
  if (isNaN(id) || id <= 0) {
     console.error('Invalid novel ID requested:', id);
     return null;
  }
  try {
    const { data, error } = await supabase
      .from('novels')
      .select(NOVEL_SELECT)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // Handle "Row not found" gracefully
        console.log(`Novel with ID ${id} not found.`);
        return null;
      }
      throw error; // Throw other errors
    }
    return data as Novel || null; // Return Novel data
  } catch (error) {
    // Note: context changed to reflect only fetching metadata
    return handleSupabaseError(error, `getNovelMetadata (ID: ${id})`);
  }
}

// NEW: Fetches only chapters for a given novel ID
export async function getNovelChapters(novelId: number): Promise<ChapterType[]> {
  if (isNaN(novelId) || novelId <= 0) {
    console.error('Invalid novel ID for fetching chapters:', novelId);
    return []; // Return empty array for invalid ID
  }
  try {
    const { data, error } = await supabase
      .from('chapters')
      .select(CHAPTER_SELECT)
      .eq('novel_id', novelId)
      .order('chapter_number', { ascending: true });

    if (error) throw error;

    // Ensure chapters is an array, even if empty
    return (data as ChapterType[]) || [];
  } catch (error) {
    handleSupabaseError(error, `getNovelChapters (Novel ID: ${novelId})`);
    return []; // Return empty array on error
  }
}


export async function getChapter(
  novelId: number,
  chapterNumber: number
): Promise<ChapterType | null> {
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
      .single(); // Expect exactly one chapter

    if (error) {
       if (error.code === 'PGRST116') {
         console.log(`Chapter number ${chapterNumber} for novel ${novelId} not found.`);
         return null;
       }
       throw error;
    }
    return data as ChapterType || null; // Assert type
  } catch (error) {
    return handleSupabaseError(error, `getChapter (Novel: ${novelId}, Chapter: ${chapterNumber})`);
  }
}

export async function deleteChapter(
  novelId: number,
  chapterId: number
): Promise<boolean> {
   if (isNaN(novelId) || novelId <= 0 || isNaN(chapterId) || chapterId <= 0) {
     console.error('Invalid novel or chapter ID for deletion:', { novelId, chapterId });
     return false;
  }
  try {
    const { error } = await supabase
      .from('chapters')
      .delete()
      .eq('id', chapterId)
      .eq('novel_id', novelId); // Ensure it belongs to the correct novel

    if (error) throw error;
    return true;
  } catch (error) {
    handleSupabaseError(error, `deleteChapter (Chapter ID: ${chapterId})`);
    return false;
  }
}

export async function addChapter(
  novelId: number,
  chapterData: Partial<ChapterType>
): Promise<ChapterType | null> {
   if (isNaN(novelId) || novelId <= 0) {
     console.error('Invalid novel ID for adding chapter:', novelId);
     return null;
  }
  if (!chapterData.chapter_number || chapterData.chapter_number <= 0) {
      console.error('Invalid chapter number provided for addChapter:', chapterData.chapter_number);
      return null;
  }
  try {
    const { data, error } = await supabase
      .from('chapters')
      .insert({ ...chapterData, novel_id: novelId })
      .select(CHAPTER_SELECT) // Select the full chapter data after insert
      .single();
    if (error) throw error;
    return data as ChapterType || null;
  } catch (error) {
    return handleSupabaseError(error, `addChapter (Novel ID: ${novelId})`);
  }
}

export async function updateChapter(
  novelId: number,
  chapterId: number,
  updateData: Partial<Omit<ChapterType, 'id' | 'novel_id' | 'created_at'>>
): Promise<boolean> {
  if (isNaN(novelId) || novelId <= 0 || isNaN(chapterId) || chapterId <= 0) {
    console.error('Invalid novel or chapter ID for update:', { novelId, chapterId });
    return false;
  }

  const cleanData = { ...updateData };
  if (Object.keys(cleanData).length === 0) {
    console.warn("updateChapter called with empty data.");
    return true;
  }

  try {
    console.log(`Updating chapter ${chapterId} with data:`, cleanData);
    const { error, data } = await supabase
      .from('chapters')
      .update(cleanData)
      .eq('id', chapterId)
      .eq('novel_id', novelId)
      .select(); // Add select to get the response data

    if (error) {
      console.error('Supabase update error:', error);
      throw error;
    }

    console.log('Update success response:', data);
    return true;
  } catch (error) {
    console.error('Detailed error in updateChapter:', error);
    const errorMessage = error instanceof Error
      ? `${error.name}: ${error.message}`
      : String(error);
    console.error(`Failed to update chapter ${chapterId}: ${errorMessage}`);
    return false;
  }
}

export async function updateAllChaptersLockStatus(
  novelId: number,
  isLocked: boolean
): Promise<boolean> {
  if (isNaN(novelId) || novelId <= 0) {
    console.error('Invalid novel ID for bulk update:', novelId);
    return false;
  }

  try {
    console.log(`Attempting to set all chapters for novel ${novelId} to is_locked: ${isLocked}`);
    const { error } = await supabase
      .from('chapters')
      .update({ is_locked: isLocked })
      .eq('novel_id', novelId);

    if (error) {
      console.error('Supabase bulk update error:', error);
      throw error;
    }

    console.log(`Bulk update successful for novel ${novelId}.`);
    return true;
  } catch (error) {
    handleSupabaseError(error, `updateAllChaptersLockStatus (Novel ID: ${novelId})`);
    return false;
  }
}