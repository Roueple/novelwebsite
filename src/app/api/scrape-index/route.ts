// src/app/api/scrape-index/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { ChapterLink } from '@/types/translation';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // Check authentication
  const supabase = createRouteHandlerClient<Database>({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user is admin
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  if (!userProfile || userProfile.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Fetch the webpage
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const html = response.data;
    const $ = cheerio.load(html);
    const baseUrl = new URL(url);
    const chapters: ChapterLink[] = [];

    // Functions to check if a link is likely a chapter link
    const isLikelyChapterLink = (href: string, text: string): boolean => {
      if (!href || href.startsWith('#')) return false;
      
      // Check URL patterns
      const urlPatterns = [
        /chapter[_-]?\d+/i, /chap[_-]?\d+/i, /episode[_-]?\d+/i, 
        /ep[_-]?\d+/i, /\d+[_-]?[화장]/i // Korean patterns
      ];
      
      if (urlPatterns.some(pattern => pattern.test(href))) return true;
      
      // Check text patterns
      const textPatterns = [
        /chapter\s*\d+/i, /chap\s*\d+/i, /episode\s*\d+/i, 
        /ep\s*\d+/i, /\d+\s*[화장]/i // Korean patterns
      ];
      
      if (textPatterns.some(pattern => pattern.test(text))) return true;
      
      return false;
    };
    
    // Look for links that might be chapters
    const chapterSelectors = [
      '.chapter-list a', '.chapters a', '.toc a', 
      'ul.chapters li a', '.table-of-contents a',
      '.episode-list a', '.episode a', '.novel-toc a',
      'table a', '#novel-chapters a', '.chapter-item a',
      'a[href*="chapter"]', 'a[href*="chap-"]', 
      'a[href*="episode"]', 'a[href*="ep-"]',
      'a[href*="화"]', // Korean "chapter" character
      'a' // Fallback - look at all links if nothing else works
    ];

    // Extract chapter data using selectors
    for (const selector of chapterSelectors) {
      $(selector).each((i, el) => {
        const href = $(el).attr('href');
        if (!href || href.startsWith('#')) return;
        
        const text = $(el).text().trim();
        if (!text) return;
        
        // Skip if not likely a chapter link (for generic selectors)
        if (selector === 'a' && !isLikelyChapterLink(href, text)) return;
        
        // Extract chapter number if present
        const chapterMatch = text.match(/chapter\s*(\d+)/i) || 
                            href.match(/chapter[_-]?(\d+)/i) ||
                            text.match(/(\d+)\s*[화장]/i);
        
        // Resolve relative URLs
        const fullUrl = href.startsWith('http') ? href : new URL(href, baseUrl).toString();
        
        // Add to chapters if not duplicate
        if (!chapters.some(c => c.url === fullUrl)) {
          chapters.push({
            title: text,
            url: fullUrl,
            chapter: chapterMatch ? parseInt(chapterMatch[1]) : undefined
          });
        }
      });
      
      // If we found a good number of chapters with a specific selector, stop looking
      if (chapters.length > 5) break;
    }

    // Sort chapters by number if possible
    chapters.sort((a, b) => {
      if (typeof a.chapter === 'number' && typeof b.chapter === 'number') {
        return a.chapter - b.chapter;
      }
      return 0;
    });

    return NextResponse.json({ chapters });
  } catch (error: unknown) {
    console.error('Scraping error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to scrape the chapter index';
    return NextResponse.json({
      error: errorMessage
    }, { status: 500 });
  }
}