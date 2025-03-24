// src/middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  // Allow test pages and APIs to pass through without auth checks
  if (req.nextUrl.pathname.startsWith('/api/translate') || 
      req.nextUrl.pathname.startsWith('/test-translation')) {
    console.log('Skipping auth check for test route:', req.nextUrl.pathname);
    return NextResponse.next();
  }
  
  // For all other routes, proceed with normal session refresh
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  await supabase.auth.getSession();
  return res;
}

// Apply middleware to all routes except static files and test routes
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};