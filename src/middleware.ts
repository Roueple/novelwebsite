// src/middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  
  // Create supabase client with middleware
  const supabase = createMiddlewareClient({ req, res });
  
  // Refresh session if expired
  const { data: { session } } = await supabase.auth.getSession();
  
  // For API routes that need authentication
  if (req.nextUrl.pathname.startsWith('/api/') && 
     (req.nextUrl.pathname.includes('/scrape') || 
      req.nextUrl.pathname.includes('/translate') || 
      req.nextUrl.pathname.includes('/scrape-index'))) {
    
    if (!session) {
      // Return a 401 response for unauthenticated API requests
      return NextResponse.json(
        { error: 'Unauthorized - Please log in to access this feature' },
        { status: 401 }
      );
    }
  }
  
  // For protected admin routes, redirect to home if not authenticated
  if (req.nextUrl.pathname.startsWith('/admin') && !session) {
    const redirectUrl = new URL('/', req.url);
    return NextResponse.redirect(redirectUrl);
  }
  
  return res;
}

// Make sure middleware runs on API routes and admin routes
export const config = {
  matcher: [
    '/admin/:path*',
    '/api/scrape',
    '/api/scrape-index',
    '/api/translate'
  ],
};