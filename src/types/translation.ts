// src/types/translation.ts

export interface TranslationProject {
  id: string;
  name: string;
  persistent_prompt: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  examples?: TranslationExample[];
  chapters?: TranslationChapter[];
}

export interface TranslationExample {
  id?: string;
  project_id?: string;
  source: string;
  target: string;
  created_at?: string;
}

export interface TranslationChapter {
  id?: string;
  project_id?: string;
  title: string;
  source_text: string;
  translated_text: string;
  temp_prompt: string;
  chapter_number?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ChapterLink {
  title: string;
  url: string;
  chapter?: string | number;
}

export interface TranslationRequest {
  sourceText: string;
  examples?: TranslationExample[];
  persistentPrompt?: string;
  tempPrompt?: string;
}

export interface TranslationResponse {
  translation: string;
  error?: string;
}

export interface ScrapeResult {
  title: string;
  chapter: string | null;
  text: string;
  url?: string;
  error?: string;
}

export interface ClientProject {
  id: string;
  name: string;
  persistentPrompt: string;
  examples: TranslationExample[];
  chapters: ClientChapter[];
}

export interface ClientChapter {
  id: string;
  title: string;
  sourceText: string;
  translatedText: string;
  tempPrompt: string;
  chapterNumber?: number;
}

// For Supabase tables
export interface TranslationTables {
  translation_projects: {
    Row: TranslationProject;
    Insert: Omit<TranslationProject, 'id' | 'created_at' | 'updated_at'>;
    Update: Partial<Omit<TranslationProject, 'id' | 'created_at' | 'updated_at'>>;
  };
  translation_examples: {
    Row: TranslationExample;
    Insert: Omit<TranslationExample, 'id' | 'created_at'>;
    Update: Partial<Omit<TranslationExample, 'id' | 'created_at'>>;
  };
  translation_chapters: {
    Row: TranslationChapter;
    Insert: Omit<TranslationChapter, 'id' | 'created_at' | 'updated_at'>;
    Update: Partial<Omit<TranslationChapter, 'id' | 'created_at' | 'updated_at'>>;
  };
}