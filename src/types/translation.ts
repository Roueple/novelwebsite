// src/types/translation.ts

// Project type
export interface TranslationProject {
    id: string;
    name: string;
    persistent_prompt: string;
    user_id: string;
    created_at: string;
    updated_at: string;
    // Use these names to match what our component uses
    examples?: TranslationExample[];
    chapters?: TranslationChapter[];
  }
  
  // Example type for few-shot learning
  export interface TranslationExample {
    id?: string;
    project_id?: string;
    source: string;
    target: string;
    created_at?: string;
  }
  
  // Chapter type
  export interface TranslationChapter {
    id?: string;
    project_id?: string;
    title: string;
    source_text: string;
    translated_text: string;
    temp_prompt: string;
    created_at?: string;
    updated_at?: string;
  }
  
  // Chapter link for scraping chapter lists
  export interface ChapterLink {
    title: string;
    url: string;
    chapter?: string | number;
  }
  
  // Translation request
  export interface TranslationRequest {
    sourceText: string;
    examples?: TranslationExample[];
    persistentPrompt?: string;
    tempPrompt?: string;
  }
  
  // Client-side project state
  export interface ClientProject {
    id: string;
    name: string;
    persistentPrompt: string;
    examples: TranslationExample[];
    chapters: ClientChapter[];
  }
  
  // Client-side chapter state
  export interface ClientChapter {
    id: string;
    title: string;
    sourceText: string;
    translatedText: string;
    tempPrompt: string;
  }
  
  // Create separate database type interfaces
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