// src/middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  // For translation-related routes, don't do any auth checks
  if (req.nextUrl.pathname.startsWith('/api/translate') ||
      req.nextUrl.pathname.startsWith('/api/scrape') ||
      req.nextUrl.pathname.startsWith('/api/scrape-index')) {
    // Simply pass through with no auth check
    return NextResponse.next();
  }
  
  // For all other routes, proceed with normal session refresh
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  await supabase.auth.getSession();
  return res;
}

// Make sure middleware runs on all routes except static files and translation API routes
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};