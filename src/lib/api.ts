// src/lib/api.ts
import { supabase } from './supabase';
import type { NovelType, ChapterType, Novel, Chapter } from '@/types/supabase'; // Use specific types
import { PostgrestError } from '@supabase/supabase-js'; // Import PostgrestError

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


export async function searchNovels(query: string): Promise<Novel[]> { // Return Novel[]
  try {
    // Basic sanitization - consider more robust library if needed
    const sanitizedQuery = query.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim(); // Allow spaces, hyphens, underscores
    if (!sanitizedQuery) return []; // Return empty if query is empty after sanitization

    const { data, error } = await supabase
      .from('novels')
      .select(NOVEL_SELECT)
      .or(
        `title.ilike.%${sanitizedQuery}%,author.ilike.%${sanitizedQuery}%,description.ilike.%${sanitizedQuery}%` // Search description too
        // Searching within array tags like this is possible but less efficient.
        // Consider a dedicated search function/index for tags if performance is critical.
        // `tags.cs.{${sanitizedQuery}}`
      )
      .order('updated_at', { ascending: false }) // Order by update potentially more relevant
      .limit(50);

    if (error) throw error; // Throw to be caught by outer try-catch
    return data || [];
  } catch (error) {
    handleSupabaseError(error, 'searchNovels');
    return []; // Return empty array on error
  }
}

export async function getLatestNovels(limit = 20): Promise<Novel[]> { // Return Novel[]
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

export async function getNovel(id: number): Promise<NovelType | null> { // Use NovelType
  if (isNaN(id) || id <= 0) {
     console.error('Invalid novel ID requested:', id);
     return null;
  }
  try {
    const [novelResponse, chaptersResponse] = await Promise.all([
      supabase
        .from('novels')
        .select(NOVEL_SELECT)
        .eq('id', id)
        .single(),
      supabase
        .from('chapters')
        .select(CHAPTER_SELECT)
        .eq('novel_id', id)
        .order('chapter_number', { ascending: true })
    ]);

    // Check novel first
    if (novelResponse.error) {
        // Handle 'PGRST116' (Row not found) specifically
        if (novelResponse.error.code === 'PGRST116') {
            console.log(`Novel with ID ${id} not found.`);
            return null;
        }
        throw novelResponse.error; // Throw other errors
    }
     if (!novelResponse.data) return null; // Should be caught by .single() error, but safeguard

    // Check chapters (even if novel exists, chapter fetch might fail)
    if (chaptersResponse.error) throw chaptersResponse.error;

    // Ensure chapters is an array, even if empty
    const chapters = chaptersResponse.data || [];

    // Combine data - ensure chapters property exists
    return {
      ...novelResponse.data,
      chapters: chapters as ChapterType[] // Assert type after fetching
    };
  } catch (error) {
    return handleSupabaseError(error, `getNovel (ID: ${id})`);
  }
}


export async function getChapter(
  novelId: number,
  chapterNumber: number
): Promise<ChapterType | null> { // Use ChapterType
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
    // Optional: Add permission checks here if needed before deleting
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
  chapterData: Partial<ChapterType> // Use ChapterType here
): Promise<ChapterType | null> { // Return ChapterType
   if (isNaN(novelId) || novelId <= 0) {
     console.error('Invalid novel ID for adding chapter:', novelId);
     return null;
  }
  // Basic validation for required fields
  if (!chapterData.chapter_number || chapterData.chapter_number <= 0) {
      console.error('Invalid chapter number provided for addChapter:', chapterData.chapter_number);
      return null;
  }
  try {
    // Optional: Add permission checks here
    const { data, error } = await supabase
      .from('chapters')
      .insert({ ...chapterData, novel_id: novelId })
      .select(CHAPTER_SELECT) // Select the full chapter data after insert
      .single();

    if (error) throw error;
    return data as ChapterType || null; // Assert type
  } catch (error) {
    return handleSupabaseError(error, `addChapter (Novel ID: ${novelId})`);
  }
}

// src/lib/api.ts

export async function updateChapter(
  novelId: number,
  chapterId: number,
  updateData: Partial<Omit<ChapterType, 'id' | 'novel_id' | 'created_at'>>
): Promise<boolean> {
  if (isNaN(novelId) || novelId <= 0 || isNaN(chapterId) || chapterId <= 0) {
    console.error('Invalid novel or chapter ID for update:', { novelId, chapterId });
    return false;
  }
  
  // Remove potentially harmful fields if necessary before update
  const cleanData = { ...updateData };
  
  if (Object.keys(cleanData).length === 0) {
    console.warn("updateChapter called with empty data.");
    return true; // No changes needed, technically successful
  }

  try {
    // Add debug logging
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
    
    // Log success response
    console.log('Update success response:', data);
    return true;
  } catch (error) {
    console.error('Detailed error in updateChapter:', error);
    // Provide more context in the error message
    const errorMessage = error instanceof Error 
      ? `${error.name}: ${error.message}` 
      : String(error);
    console.error(`Failed to update chapter ${chapterId}: ${errorMessage}`);
    return false;
  }
}