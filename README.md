This project is a Web Novel Reading Platform called Roueple Novel Website

Goal: To provide an excellent user experience for reading web novels online, with features for both readers and administrators, prioritizing performance and maintainability.   
Tech Stack:
Frontend: Next.js (v15+)  using the App Router, React (v19+), TypeScript.   
Styling: Tailwind CSS  with shadcn/ui components  and custom CSS variables for theming (light, dark, reading modes defined in globals.css).   
Backend/DB: Supabase (inferred PostgreSQL DB, Auth, Storage). Used with @supabase/auth-helpers-nextjs.   
Deployment: Vercel.   
Key Features/Modules:
User Authentication (Supabase Auth): Supports Email OTP, Google OAuth, and Anonymous/Guest access with account linking capabilities. Includes profile management (src/types/supabase.ts defines Profile type ).   
Novel Browsing: Homepage displays latest novels (src/app/page.tsx ), dedicated novel detail pages (src/app/novels/[id]/page.tsx ), and novel search functionality (src/app/search/ ).   
Chapter Reading: Dedicated chapter reading view (src/app/novels/[id]/chapter/[chapterId]/page.tsx ) with customizable reading preferences (font, size, spacing, theme via useReadingPreferences hook ), dynamic text effects (src/components/reading/dynamic-text.tsx ), floating controls (FloatingReadingControls.tsx ), and direct chapter navigation buttons (DirectChapterNavigation.tsx).   
Admin Features (src/app/admin/ ): Includes comment moderation (/comments/page.tsx ) and management/testing of dynamic text effects (/text-effects/page.tsx ). Uses role-based access control (AdminRoleCheck.tsx ).   
Content Management (Admin/Author): Features novel creation (/novels/create/page.tsx ), chapter creation (AddChapterModal.tsx ), and chapter editing (/edit/page.tsx ) including title, content (ChapterFullEditor.tsx ), and lock status. Supports cover image uploads (using src/lib/upload.ts  and Supabase Storage ).   
Comments: Per-chapter commenting system (ChapterComments.tsx ) with admin approval flow.   
Core Priorities: 
Excellent User Experience (Intuitive, readable, seamless)    
High Performance (Fast loads, responsive UI)    
Code Quality & Reusability (Modular, DRY, documented)    
Scalability    
Maintainability    
