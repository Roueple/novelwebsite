export type Novel = {
    id: number;
    title: string;
    cover_url: string | null;
    author: string;
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
  }

  interface ChapterType {
    id: number;
    title: string;
    content: string;
    chapter_number: number;
    is_locked: boolean;
    // add other fields as needed
  }
  
  export interface Database {
    public: {
      Tables: {
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