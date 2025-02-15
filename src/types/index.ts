export interface Novel {
    id: number;
    title: string;
    cover: string;
    author: string;
    rating: number;
    tags: string[];
    status: 'Ongoing' | 'Completed';
    description?: string;
  }
  
  export interface Chapter {
    id: number;
    title: string;
    dateAdded: string;
    locked: boolean;
    content?: string;
  }
  
  export interface NovelDetails extends Novel {
    description: string;
    chapters: Chapter[];
  }