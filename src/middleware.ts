// src/middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  // For translation API testing, don't enforce auth temporarily
  if (req.nextUrl.pathname.startsWith('/api/translate')) {
    // Allow translation API calls without auth checks for testing
    return NextResponse.next();
  }
  
  // For all other routes, proceed with normal session refresh
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  await supabase.auth.getSession();
  return res;
}

// Apply middleware to all routes except static files
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};