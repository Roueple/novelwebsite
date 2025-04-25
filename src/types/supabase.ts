// src/types/supabase.ts

export type UserRole = 'admin' | 'reader'; // Only 'admin' and 'reader' roles

export type Profile = {
  id: string;
  username: string;
  role: UserRole; // 'admin' or 'reader'
  // Removed is_creator as per requirements
  is_guest: boolean;
  created_at: string;
  updated_at: string;
}

export type Novel = {
  id: number;
  title: string;
  cover_url: string | null;
  author: string;
  author_id?: string;  // Keep author_id to link novels to users
  rating: number;
  status: 'Ongoing' | 'Completed';
  tags: string[];
  description: string | null;
  created_at: string;
  updated_at: string;
}

export type Chapter = {
  id: number;
  novel_id: number;
  chapter_number: number;
  title: string;
  content: string | null;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
  newly_created: boolean;
}

export interface ChapterType extends Chapter {
  content: string;
  newly_created: boolean;
}

export interface NovelType extends Novel {
  chapters: ChapterType[];
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>;
      };
      novels: {
        Row: Novel;
        Insert: Omit<Novel, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Novel, 'id' | 'created_at' | 'updated_at'>>;
      };
      chapters: {
        Row: Chapter;
        Insert: Omit<Chapter, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Chapter, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
  };
}
