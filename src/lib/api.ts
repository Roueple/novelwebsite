// src/lib/api.ts
import { supabase } from './supabase';
import type { NovelType, ChapterType } from '@/types/supabase';

export async function getLatestNovels() {
  try {
    const { data, error } = await supabase
      .from('novels')
      .select(`
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
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching novels:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getLatestNovels:', error);
    return [];
  }
}

export async function getNovel(id: number): Promise<NovelType | null> {
  try {
    // Get novel with author information
    const { data: novel, error: novelError } = await supabase
      .from('novels')
      .select(`
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
      `)
      .eq('id', id)
      .single();

    if (novelError) {
      console.error('Error fetching novel:', novelError);
      throw novelError;
    }

    // Get chapters
    const { data: chapters, error: chaptersError } = await supabase
      .from('chapters')
      .select(`
        id,
        novel_id,
        chapter_number,
        title,
        content,
        is_locked,
        created_at,
        updated_at
      `)
      .eq('novel_id', id)
      .order('chapter_number', { ascending: true });

    if (chaptersError) {
      console.error('Error fetching chapters:', chaptersError);
      throw chaptersError;
    }

    return {
      ...novel,
      chapters: chapters || []
    };
  } catch (error) {
    console.error('Error in getNovel:', error);
    return null;
  }
}

export async function getChapter(novelId: number, chapterNumber: number): Promise<ChapterType | null> {
  try {
    console.log('Fetching chapter:', { novelId, chapterNumber });

    // First, get the chapter
    const { data: chapter, error: chapterError } = await supabase
      .from('chapters')
      .select(`
        id,
        novel_id,
        chapter_number,
        title,
        content,
        is_locked,
        created_at,
        updated_at
      `)
      .eq('novel_id', novelId)
      .eq('chapter_number', chapterNumber)
      .single();

    if (chapterError) {
      console.error('Error fetching chapter:', chapterError);
      return null;
    }

    if (!chapter) {
      console.error('Chapter not found');
      return null;
    }

    console.log('Chapter found:', chapter);
    return chapter;
  } catch (error) {
    console.error('Error in getChapter:', error);
    return null;
  }
}

export async function deleteChapter(novelId: number, chapterId: number) {
  try {
    const { error } = await supabase
      .from('chapters')
      .delete()
      .eq('id', chapterId)
      .eq('novel_id', novelId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting chapter:', error);
    return false;
  }
}

export async function addChapter(novelId: number, chapterData: Partial<ChapterType>) {
  try {
    const { data, error } = await supabase
      .from('chapters')
      .insert({ ...chapterData, novel_id: novelId })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding chapter:', error);
    return null;
  }
}

export async function updateChapter(
  novelId: number, 
  chapterId: number, 
  data: Partial<ChapterType>
) {
  try {
    const { error } = await supabase
      .from('chapters')
      .update(data)
      .eq('id', chapterId)
      .eq('novel_id', novelId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating chapter:', error);
    return false;
  }
}