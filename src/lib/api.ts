import { supabase } from './supabase';

export async function getLatestNovels() {
  const { data, error } = await supabase
    .from('novels')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching novels:', error);
    return [];
  }

  return data;
}

export async function getNovel(id: number) {
  const { data: novel, error: novelError } = await supabase
    .from('novels')
    .select('*')
    .eq('id', id)
    .single();

  if (novelError) {
    console.error('Error fetching novel:', novelError);
    return null;
  }

  const { data: chapters, error: chaptersError } = await supabase
    .from('chapters')
    .select('id, chapter_number, title, is_locked')
    .eq('novel_id', id)
    .order('chapter_number', { ascending: true });

  if (chaptersError) {
    console.error('Error fetching chapters:', chaptersError);
    return null;
  }

  return {
    ...novel,
    chapters: chapters || []
  };
}

export async function getChapter(novelId: number, chapterNumber: number) {
  const { data, error } = await supabase
    .from('chapters')
    .select('*')
    .eq('novel_id', novelId)
    .eq('chapter_number', chapterNumber)
    .single();

  if (error) {
    console.error('Error fetching chapter:', error);
    return null;
  }

  return data;
}