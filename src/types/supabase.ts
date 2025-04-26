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

export type Comment = {
  id: number;
  created_at: string;
  updated_at: string;
  user_id: string | null;
  chapter_id: number;
  parent_comment_id: number | null;
  content: string;
  is_approved: boolean; // NEW: Moderation status
  // Include profile information, now including is_guest
  profiles?: Pick<Profile, 'username' | 'is_guest'> | null; // Add is_guest
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
      comments: {
        Row: Comment;
        // is_approved is handled by default value or update, not direct insert
        Insert: Omit<Comment, 'id' | 'created_at' | 'updated_at' | 'profiles' | 'is_approved'>;
        // Allow updating content and is_approved status
        Update: Partial<Omit<Comment, 'id' | 'created_at' | 'user_id' | 'chapter_id' | 'parent_comment_id' | 'profiles'>>;
      };
    };
    Functions: {};
  };
}

