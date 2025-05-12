// src/types/index.ts
import type { Database as SupabaseDB } from './supabase'; // Make sure this path is correct

export type Profile = SupabaseDB['public']['Tables']['profiles']['Row'];
export type UserRole = SupabaseDB['public']['Enums']['user_role_enum'];
export type Novel = SupabaseDB['public']['Tables']['novels']['Row'];
export type Chapter = SupabaseDB['public']['Tables']['chapters']['Row'];
export type Comment = SupabaseDB['public']['Tables']['comments']['Row'];
export interface NovelDetails extends Novel {
  chapters: Chapter[]; // Uses the new 'Chapter' type
}