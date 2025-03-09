// src/lib/translation-service.ts
import { TranslationProject, TranslationExample, TranslationChapter, ChapterLink, TranslationRequest } from '@/types/translation';
import { supabase } from '@/lib/supabase';

export const translationService = {
  // Project operations
  async getProjects(): Promise<TranslationProject[]> {
    const { data, error } = await supabase
      .from('translation_projects')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async getProject(id: string): Promise<TranslationProject | null> {
    const { data, error } = await supabase
      .from('translation_projects')
      .select(`
        *,
        translation_examples(*),
        translation_chapters(*)
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // Record not found
      throw error;
    }
    
    return data;
  },

  async createProject(name: string, persistentPrompt: string = ''): Promise<TranslationProject> {
    const { data, error } = await supabase
      .from('translation_projects')
      .insert({
        name,
        persistent_prompt: persistentPrompt,
        user_id: (await supabase.auth.getUser()).data.user?.id || ''
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateProject(id: string, updates: Partial<TranslationProject>): Promise<void> {
    const { error } = await supabase
      .from('translation_projects')
      .update({
        name: updates.name,
        persistent_prompt: updates.persistent_prompt,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    
    if (error) throw error;
  },

  async deleteProject(id: string): Promise<void> {
    const { error } = await supabase
      .from('translation_projects')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // Examples operations
  async getExamples(projectId: string): Promise<TranslationExample[]> {
    const { data, error } = await supabase
      .from('translation_examples')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  async addExample(projectId: string, source: string, target: string): Promise<TranslationExample> {
    const { data, error } = await supabase
      .from('translation_examples')
      .insert({
        project_id: projectId,
        source,
        target
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateExample(id: string, source: string, target: string): Promise<void> {
    const { error } = await supabase
      .from('translation_examples')
      .update({
        source,
        target
      })
      .eq('id', id);
    
    if (error) throw error;
  },

  async deleteExample(id: string): Promise<void> {
    const { error } = await supabase
      .from('translation_examples')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // Chapters operations
  async getChapters(projectId: string): Promise<TranslationChapter[]> {
    const { data, error } = await supabase
      .from('translation_chapters')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  async getChapter(id: string): Promise<TranslationChapter | null> {
    const { data, error } = await supabase
      .from('translation_chapters')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    
    return data;
  },

  async addChapter(
    projectId: string, 
    title: string, 
    sourceText: string, 
    translatedText: string = '', 
    tempPrompt: string = ''
  ): Promise<TranslationChapter> {
    const { data, error } = await supabase
      .from('translation_chapters')
      .insert({
        project_id: projectId,
        title,
        source_text: sourceText,
        translated_text: translatedText,
        temp_prompt: tempPrompt
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateChapter(
    id: string, 
    updates: Partial<TranslationChapter>
  ): Promise<void> {
    const updateData: any = {...updates, updated_at: new Date().toISOString()};
    delete updateData.id;
    delete updateData.project_id;
    delete updateData.created_at;
    
    const { error } = await supabase
      .from('translation_chapters')
      .update(updateData)
      .eq('id', id);
    
    if (error) throw error;
  },

  async deleteChapter(id: string): Promise<void> {
    const { error } = await supabase
      .from('translation_chapters')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // External API operations
  async translateText(request: TranslationRequest, stream = false): Promise<Response> {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...request,
        stream
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Translation failed');
    }
    
    return response;
  },

  async scrapeWebsite(url: string): Promise<{ title: string; chapter: string | null; text: string }> {
    const response = await fetch('/api/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to scrape the website');
    }
    
    return response.json();
  },


  async scrapeChapterIndex(url: string): Promise<{ chapters: ChapterLink[] }> {
    const response = await fetch('/api/scrape-index', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to scrape the chapter index');
    }
    
    return response.json();
  }
};