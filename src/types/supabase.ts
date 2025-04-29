// src/types/supabase.ts

export type UserRole = 'admin' | 'reader';

export type Profile = {
  id: string;
  username: string;
  role: UserRole;
  is_guest: boolean; // Flag to identify guest users
  created_at: string;
  updated_at: string;
}

export type Novel = {
  id: number;
  title: string;
  cover_url: string | null;
  author: string;
  author_id?: string;
  rating: number;
  status: 'Ongoing' | 'Completed';
  tags: string[];
  description: string | null;
  created_at: string;
  updated_at: string;
}

// Base Chapter type - Allows null content
export type Chapter = {
  id: number;
  novel_id: number;
  chapter_number: number;
  title: string;
  content: string | null; // Content can be null from DB or when stripped
  is_locked: boolean;
  created_at: string;
  updated_at: string;
  newly_created: boolean; // Keep this if used elsewhere
}

export type Comment = {
  id: number;
  created_at: string;
  updated_at: string;
  user_id: string | null;
  chapter_id: number;
  parent_comment_id: number | null;
  content: string;
  is_approved: boolean; // Moderation status
  // Include profile information, now including is_guest
  profiles?: Pick<Profile, 'username' | 'is_guest'> | null;
}

// *** FIX: Allow ChapterType content to be null ***
// This type is often used for components that *expect* content,
// but it must align with the possibility of it being null due to locks/API responses.
export interface ChapterType extends Chapter {
  content: string | null; // <-- MODIFIED: Changed from 'string' to 'string | null'
  // newly_created: boolean; // This was already in the base Chapter type
}

export interface NovelType extends Novel {
  chapters: ChapterType[]; // This might need adjustment if chapters here shouldn't have content
}

// Database interface remains the same
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
        Row: Chapter; // Base type allows content: string | null
        Insert: Omit<Chapter, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Chapter, 'id' | 'created_at' | 'updated_at'>>;
      };
      comments: {
        Row: Comment;
        Insert: Omit<Comment, 'id' | 'created_at' | 'updated_at' | 'profiles' | 'is_approved'>;
        Update: Partial<Omit<Comment, 'id' | 'created_at' | 'user_id' | 'chapter_id' | 'parent_comment_id' | 'profiles'>>;
      };
    };
    Functions: {};
  };
}