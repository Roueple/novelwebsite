// src/lib/api.ts
import { supabase } from './supabase';
import type { NovelType, ChapterType } from '@/types/supabase';

// Common select fields to avoid repetition
const NOVEL_SELECT = `
  id,
  title,
  cover_url,
  author,
  author_id,
  rating,
  status,
  tags,
  description,
  created_at,
  updated_at
`;

const CHAPTER_SELECT = `
  id,
  novel_id,
  chapter_number,
  title,
  content,
  is_locked,
  created_at,
  updated_at
`;

// Error handling utility
function handleSupabaseError(error: any, context: string) {
  console.error(`Error in ${context}:`, error);
  return null;
}

export async function searchNovels(query: string) {
  try {
    // Sanitize query to prevent SQL injection
    const sanitizedQuery = query.replace(/[^a-zA-Z0-9 ]/g, '');

    const { data, error } = await supabase
      .from('novels')
      .select(NOVEL_SELECT)
      .or(
        `title.ilike.%${sanitizedQuery}%,author.ilike.%${sanitizedQuery}%,tags.cs.{${sanitizedQuery}}`
      )
      .order('created_at', { ascending: false })
      .limit(50); // Limit results to prevent performance issues

    if (error) throw error;
    return data || [];
  } catch (error) {
    return handleSupabaseError(error, 'searchNovels') || [];
  }
}

export async function getLatestNovels(limit = 20) {
  try {
    const { data, error } = await supabase
      .from('novels')
      .select(NOVEL_SELECT)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    return handleSupabaseError(error, 'getLatestNovels') || [];
  }
}

export async function getNovel(id: number): Promise<NovelType | null> {
  try {
    // Fetch novel and chapters in parallel
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

    if (novelResponse.error) throw novelResponse.error;
    if (chaptersResponse.error) throw chaptersResponse.error;

    return {
      ...novelResponse.data,
      chapters: chaptersResponse.data || []
    };
  } catch (error) {
    return handleSupabaseError(error, 'getNovel');
  }
}

export async function getChapter(
  novelId: number, 
  chapterNumber: number
): Promise<ChapterType | null> {
  try {
    const { data, error } = await supabase
      .from('chapters')
      .select(CHAPTER_SELECT)
      .eq('novel_id', novelId)
      .eq('chapter_number', chapterNumber)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    return handleSupabaseError(error, 'getChapter');
  }
}

export async function deleteChapter(
  novelId: number, 
  chapterId: number
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('chapters')
      .delete()
      .eq('id', chapterId)
      .eq('novel_id', novelId);

    if (error) throw error;
    return true;
  } catch (error) {
    handleSupabaseError(error, 'deleteChapter');
    return false;
  }
}

export async function addChapter(
  novelId: number, 
  chapterData: Partial<ChapterType>
) {
  try {
    const { data, error } = await supabase
      .from('chapters')
      .insert({ ...chapterData, novel_id: novelId })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    return handleSupabaseError(error, 'addChapter');
  }
}

export async function updateChapter(
  novelId: number, 
  chapterId: number, 
  data: Partial<ChapterType>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('chapters')
      .update(data)
      .eq('id', chapterId)
      .eq('novel_id', novelId);

    if (error) throw error;
    return true;
  } catch (error) {
    handleSupabaseError(error, 'updateChapter');
    return false;
  }
}