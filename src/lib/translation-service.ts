// src/lib/translation-service.ts
import { 
  TranslationProject, 
  TranslationExample, 
  TranslationChapter, 
  ChapterLink, 
  TranslationRequest,
  ScrapeResult
} from '@/types/translation';
import { supabase } from '@/lib/supabase';

// Create a cache for project data to reduce database calls
const projectCache = new Map<string, {
  data: TranslationProject;
  timestamp: number;
}>();

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Service for handling translation-related operations
 */
export const translationService = {
  /**
   * Gets all translation projects for the current user
   */
  async getProjects(): Promise<TranslationProject[]> {
    try {
      const { data, error } = await supabase
        .from('translation_projects')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching projects:', error);
      throw new Error('Failed to fetch translation projects');
    }
  },

  /**
   * Gets a specific project by ID with its examples and chapters
   */
  async getProject(id: string): Promise<TranslationProject | null> {
    try {
      // Check cache first
      const cached = projectCache.get(id);
      if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        return cached.data;
      }
      
      // Parallel requests for better performance
      const [projectResult, examplesResult, chaptersResult] = await Promise.all([
        supabase
          .from('translation_projects')
          .select('*')
          .eq('id', id)
          .single(),
        
        supabase
          .from('translation_examples')
          .select('*')
          .eq('project_id', id),
          
        supabase
          .from('translation_chapters')
          .select('*')
          .eq('project_id', id)
          .order('created_at', { ascending: true })
      ]);
      
      if (projectResult.error) {
        if (projectResult.error.code === 'PGRST116') return null; // Record not found
        throw projectResult.error;
      }
      
      if (examplesResult.error) throw examplesResult.error;
      if (chaptersResult.error) throw chaptersResult.error;
      
      // Combine the data
      const project = {
        ...projectResult.data,
        examples: examplesResult.data || [],
        chapters: chaptersResult.data || []
      };
      
      // Update cache
      projectCache.set(id, {
        data: project,
        timestamp: Date.now()
      });
      
      return project;
    } catch (error) {
      console.error('Error fetching project:', error);
      return null;
    }
  },

  /**
   * Creates a new translation project
   */
  async createProject(name: string, persistentPrompt: string = ''): Promise<TranslationProject> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      
      if (!userId) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('translation_projects')
        .insert({
          name,
          persistent_prompt: persistentPrompt,
          user_id: userId
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating project:', error);
      throw new Error('Failed to create project');
    }
  },

  /**
   * Updates an existing translation project
   */
  async updateProject(id: string, updates: Partial<TranslationProject>): Promise<void> {
    try {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString()
      };
      
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.persistent_prompt !== undefined) updateData.persistent_prompt = updates.persistent_prompt;
      
      const { error } = await supabase
        .from('translation_projects')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
      
      // Invalidate cache
      projectCache.delete(id);
    } catch (error) {
      console.error('Error updating project:', error);
      throw new Error('Failed to update project');
    }
  },

  /**
   * Deletes a translation project
   */
  async deleteProject(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('translation_projects')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Remove from cache
      projectCache.delete(id);
    } catch (error) {
      console.error('Error deleting project:', error);
      throw new Error('Failed to delete project');
    }
  },

  /**
   * Gets all examples for a project
   */
  async getExamples(projectId: string): Promise<TranslationExample[]> {
    try {
      const { data, error } = await supabase
        .from('translation_examples')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching examples:', error);
      throw new Error('Failed to fetch examples');
    }
  },

  /**
   * Adds a new example to a project
   */
  async addExample(projectId: string, source: string, target: string): Promise<TranslationExample> {
    try {
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
      
      // Invalidate cache
      projectCache.delete(projectId);
      
      return data;
    } catch (error) {
      console.error('Error adding example:', error);
      throw new Error('Failed to add example');
    }
  },

  /**
   * Updates an existing example
   */
  async updateExample(id: string, source: string, target: string): Promise<void> {
    try {
      const { error, data } = await supabase
        .from('translation_examples')
        .update({
          source,
          target
        })
        .eq('id', id)
        .select('project_id')
        .single();
      
      if (error) throw error;
      
      // Invalidate cache if we have project_id
      if (data?.project_id) {
        projectCache.delete(data.project_id);
      }
    } catch (error) {
      console.error('Error updating example:', error);
      throw new Error('Failed to update example');
    }
  },

  /**
   * Deletes an example
   */
  async deleteExample(id: string): Promise<void> {
    try {
      // Get project_id before deleting to invalidate cache
      const { data: exampleData } = await supabase
        .from('translation_examples')
        .select('project_id')
        .eq('id', id)
        .single();
      
      const { error } = await supabase
        .from('translation_examples')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Invalidate cache
      if (exampleData?.project_id) {
        projectCache.delete(exampleData.project_id);
      }
    } catch (error) {
      console.error('Error deleting example:', error);
      throw new Error('Failed to delete example');
    }
  },

  /**
   * Batch save examples for a project
   */
  async saveExamples(projectId: string, examples: TranslationExample[]): Promise<void> {
    try {
      // Start a transaction
      const { error: existingError } = await supabase
        .from('translation_examples')
        .delete()
        .eq('project_id', projectId);
      
      if (existingError) throw existingError;
      
      // Add all new examples if there are any
      if (examples.length > 0) {
        const { error: insertError } = await supabase
          .from('translation_examples')
          .insert(
            examples.map(ex => ({
              project_id: projectId,
              source: ex.source,
              target: ex.target
            }))
          );
        
        if (insertError) throw insertError;
      }
      
      // Invalidate cache
      projectCache.delete(projectId);
    } catch (error) {
      console.error('Error saving examples:', error);
      throw new Error('Failed to save examples');
    }
  },

  /**
   * Gets all chapters for a project
   */
  async getChapters(projectId: string): Promise<TranslationChapter[]> {
    try {
      const { data, error } = await supabase
        .from('translation_chapters')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching chapters:', error);
      throw new Error('Failed to fetch chapters');
    }
  },

  /**
   * Gets a specific chapter by ID
   */
  async getChapter(id: string): Promise<TranslationChapter | null> {
    try {
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
    } catch (error) {
      console.error('Error fetching chapter:', error);
      throw new Error('Failed to fetch chapter');
    }
  },

  /**
   * Adds a new chapter to a project
   */
  async addChapter(
    projectId: string, 
    title: string, 
    sourceText: string, 
    translatedText: string = '', 
    tempPrompt: string = '',
    chapterNumber?: number
  ): Promise<TranslationChapter> {
    try {
      const { data, error } = await supabase
        .from('translation_chapters')
        .insert({
          project_id: projectId,
          title,
          source_text: sourceText,
          translated_text: translatedText,
          temp_prompt: tempPrompt,
          chapter_number: chapterNumber
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Invalidate cache
      projectCache.delete(projectId);
      
      return data;
    } catch (error) {
      console.error('Error adding chapter:', error);
      throw new Error('Failed to add chapter');
    }
  },

  /**
   * Updates an existing chapter
   */
  async updateChapter(
    id: string, 
    updates: Partial<TranslationChapter>
  ): Promise<void> {
    try {
      // Get project_id for cache invalidation
      const { data: chapterData } = await supabase
        .from('translation_chapters')
        .select('project_id')
        .eq('id', id)
        .single();
      
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString()
      };
      
      // Only include fields that are provided in the updates
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.source_text !== undefined) updateData.source_text = updates.source_text;
      if (updates.translated_text !== undefined) updateData.translated_text = updates.translated_text;
      if (updates.temp_prompt !== undefined) updateData.temp_prompt = updates.temp_prompt;
      if (updates.chapter_number !== undefined) updateData.chapter_number = updates.chapter_number;
      
      const { error } = await supabase
        .from('translation_chapters')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
      
      // Invalidate cache
      if (chapterData?.project_id) {
        projectCache.delete(chapterData.project_id);
      }
    } catch (error) {
      console.error('Error updating chapter:', error);
      throw new Error('Failed to update chapter');
    }
  },

  /**
   * Deletes a chapter
   */
  async deleteChapter(id: string): Promise<void> {
    try {
      // Get project_id before deleting to invalidate cache
      const { data: chapterData } = await supabase
        .from('translation_chapters')
        .select('project_id')
        .eq('id', id)
        .single();
      
      const { error } = await supabase
        .from('translation_chapters')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Invalidate cache
      if (chapterData?.project_id) {
        projectCache.delete(chapterData.project_id);
      }
    } catch (error) {
      console.error('Error deleting chapter:', error);
      throw new Error('Failed to delete chapter');
    }
  },

  /**
   * Translates text using the translation API
   */
  async translateText(request: TranslationRequest, stream = false): Promise<Response> {
    try {
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
      
      if (!response.ok && !stream) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Translation failed');
      }
      
      return response;
    } catch (error) {
      console.error('Translation API error:', error);
      throw error;
    }
  },

  /**
   * Scrapes content from a website
   */
  async scrapeWebsite(url: string): Promise<ScrapeResult> {
    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url })
      });
      
      // Parse the response to JSON
      const data = await response.json();
      
      // Check if the response was successful
      if (!response.ok) {
        throw new Error(data.error || 'Failed to scrape the website');
      }
      
      // Verify that we have text content
      if (!data.text || data.text.trim() === '') {
        throw new Error('No content was extracted from the website');
      }
      
      return {
        ...data,
        url
      };
    } catch (error) {
      console.error('Scraping error:', error);
      throw error;
    }
  },

  /**
   * Scrapes a chapter index to find multiple chapters
   */
  async scrapeChapterIndex(url: string): Promise<{ chapters: ChapterLink[] }> {
    try {
      const response = await fetch('/api/scrape-index', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to scrape the chapter index');
      }
      
      return response.json();
    } catch (error) {
      console.error('Chapter index scraping error:', error);
      throw error;
    }
  }
};