// src/lib/api.ts
import { supabase } from './supabase';
import type { Novel, NovelType, ChapterType } from '@/types/supabase';

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
        *,
        author:profiles!novels_author_id_fkey(username)
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
      .select('id, chapter_number, title, is_locked')
      .eq('novel_id', id)
      .order('chapter_number', { ascending: true });

    if (chaptersError) {
      console.error('Error fetching chapters:', chaptersError);
      throw chaptersError;
    }

    return {
      ...novel,
      author: novel.author?.username || novel.author, // Fallback to old author field if needed
      chapters: chapters || []
    };
  } catch (error) {
    console.error('Error in getNovel:', error);
    return null;
  }
}

export async function getChapter(novelId: number, chapterNumber: number): Promise<ChapterType | null> {
  try {
    const { data, error } = await supabase
      .from('chapters')
      .select(`
        *,
        novel:novels!chapters_novel_id_fkey(
          id,
          author_id,
          author:profiles!novels_author_id_fkey(username)
        )
      `)
      .eq('novel_id', novelId)
      .eq('chapter_number', chapterNumber)
      .single();

    if (error) {
      console.error('Error fetching chapter:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in getChapter:', error);
    return null;
  }
}