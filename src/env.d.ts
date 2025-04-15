// src/env.d.ts
declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_SUPABASE_URL: string; // Just the type 'string'
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string; // Just the type 'string'
  }
}

export {};