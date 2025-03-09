// src/app/api/scrape/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';
import axios from 'axios';
import * as cheerio from 'cheerio';

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

    // Validate URL format
    try {
      new URL(url);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    try {
      // Fetch the webpage
      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      });

      const html = response.data;
      // Use any type to bypass TypeScript errors with Cheerio
      const $ = cheerio.load(html) as any;

      // Extract title
      const title = $('title').text().trim();
      
      // Look for chapter number in title or URL
      const chapterMatch = title.match(/chapter\s+(\d+)/i) || 
                           url.match(/chapter[_-]?(\d+)/i) ||
                           title.match(/(\d+)\s*화/i);  // Korean chapter indicator
      const chapter = chapterMatch ? chapterMatch[1] : null;

      // Extract content using multiple strategies
      let text = '';

      // Try common content selectors
      const contentSelectors = [
        'article', '.novel-content', '.chapter-content', 
        '.content', '#content', '.post-content',
        '.entry-content', '.chapter', '#novel', '.novel',
        '.article-content'
      ];

      // Try to find content using common selectors
      for (const selector of contentSelectors) {
        const element = $(selector);
        if (element.length) {
          // Remove ads, nav elements, comments
          element.find('script, style, iframe, .ads, .ad, .nav, .navigation, .comment, .comments').remove();
          text = element.text().trim();
          if (text.length > 100) break;
        }
      }

      // Fallback: If no content found with selectors, just get the body text
      if (!text || text.length < 100) {
        // Remove common elements that aren't part of the story
        $('header, footer, nav, aside, .sidebar, .comments, .comment, .ad, .ads, script, style, iframe').remove();
        text = $('body').text().trim();
      }

      // Clean up the text
      text = text.replace(/\s{2,}/g, '\n\n'); // Replace multiple whitespace with double newline
      text = text.replace(/[\r\n]{3,}/g, '\n\n'); // Replace excessive newlines

      // Check for content 
      if (text.length < 100) {
        throw new Error('Could not extract meaningful content. Content length: ' + text.length);
      }

      return NextResponse.json({
        title,
        chapter,
        text
      });

    } catch (axiosError: any) {
      // Handle errors
      const message = axiosError.message || 'Unknown error';
      const status = axiosError.response?.status || 'unknown';
      
      return NextResponse.json({ 
        error: `Failed to fetch website: ${message} (Status: ${status})`
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Scraping error:', error);
    const errorMessage = error.message || 'Failed to scrape the website';
    return NextResponse.json({
      error: errorMessage
    }, { status: 500 });
  }
}