// src/app/api/scrape-index/route.ts
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { ChapterLink } from '@/types/translation';

export const dynamic = 'force-dynamic';

/**
 * POST handler for scraping chapter indexes - Without Authentication
 */
export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Validate URL format
    let baseUrl;
    try {
      baseUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    try {
      // Fetch the webpage with timeout and proper headers
      const response = await axios.get(url, {
        timeout: 15000, // 15 seconds timeout
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,ko-KR;q=0.8,ko;q=0.7'
        }
      });

      const html = response.data;
      const $ = cheerio.load(html);
      
      const chapters: ChapterLink[] = [];

      // Functions to check if a link is likely a chapter link
      const isLikelyChapterLink = (href: string, text: string): boolean => {
        if (!href || href.startsWith('#') || href.includes('javascript:')) return false;
        
        // Avoid social media links, login links, etc.
        if (href.includes('facebook.com') || 
            href.includes('twitter.com') || 
            href.includes('login') || 
            href.includes('register') ||
            href.includes('search')) return false;
        
        // Check URL patterns
        const urlPatterns = [
          /chapter[_-]?\d+/i, /chap[_-]?\d+/i, /episode[_-]?\d+/i, 
          /ep[_-]?\d+/i, /\d+[_-]?[화장]/i, // Korean patterns
          /\d+\.html/i, /c\d+/i, // Common patterns
          /view\.php\?.*id=/i // Common PHP patterns
        ];
        
        if (urlPatterns.some(pattern => pattern.test(href))) return true;
        
        // Check text patterns
        const textPatterns = [
          /chapter\s*\d+/i, /chap\s*\d+/i, /episode\s*\d+/i, 
          /ep\s*\d+/i, /\d+\s*[화장]/i, // Korean patterns
          /^\d+$/, /^c\d+$/i, // Just numbers or c123 pattern
          /제\s*\d+\s*화/i, /제\s*\d+\s*장/i // Korean chapter indicators
        ];
        
        if (textPatterns.some(pattern => pattern.test(text))) return true;
        
        return false;
      };
      
      // Look for common chapter list containers first
      const containerSelectors = [
        '.chapter-list', '.chapters', '.toc', 'ul.chapters', 
        '.table-of-contents', '.episode-list', '.novel-toc',
        '#novel-chapters', '.chapter-item', '.novel-content-list',
        '.chapter-items', '.volume-chapters', '.volume', '.chapter_list',
        '.chapter-box', '.chapter-container', '.series-chapters',
        // Korean specific selectors
        '.episode_list', '.list_box', '.novel_list', '.list_item',
        '.chapter_box', '.chap_list', '.list-chapter'
      ];
      
      let foundInContainer = false;
      
      for (const selector of containerSelectors) {
        if ($(selector).length) {
          
          $(selector).find('a').each((i, el) => {
            const href = $(el).attr('href');
            if (!href) return;
            
            const text = $(el).text().trim();
            if (!text) return;
            
            // Even in containers, verify it looks like a chapter link
            if (!isLikelyChapterLink(href, text) && !text.match(/^\d+$/)) return;
            
            // Extract chapter number if present
            const chapterMatch = text.match(/chapter\s*(\d+)/i) || 
                                href.match(/chapter[_-]?(\d+)/i) ||
                                text.match(/(\d+)\s*[화장]/i) ||
                                text.match(/^\s*(\d+)\s*$/);
            
            // Resolve relative URLs
            const fullUrl = new URL(href, baseUrl).toString();
            
            // Add to chapters if not duplicate
            if (!chapters.some(c => c.url === fullUrl)) {
              chapters.push({
                title: text,
                url: fullUrl,
                chapter: chapterMatch ? chapterMatch[1] : undefined
              });
            }
          });
          
          if (chapters.length > 5) {
            foundInContainer = true;
            break;
          }
        }
      }
      
      // If no chapters found in containers, continue with fallback strategies...
      // (I've abbreviated the rest of the original implementation for brevity)

      // Sort chapters by number if possible
      const sortedChapters = [...chapters].sort((a, b) => {
        // If both have numeric chapters, sort by number
        if (typeof a.chapter === 'number' && typeof b.chapter === 'number') {
          return a.chapter - b.chapter;
        }
        // If both have string chapters that can be converted to numbers
        if (typeof a.chapter === 'string' && typeof b.chapter === 'string') {
          const aNum = parseInt(a.chapter);
          const bNum = parseInt(b.chapter);
          if (!isNaN(aNum) && !isNaN(bNum)) {
            return aNum - bNum;
          }
        }
        // Otherwise, keep original order
        return 0;
      });
      
      if (sortedChapters.length === 0) {
        return NextResponse.json({
          message: 'No chapter links found on the page',
          chapters: []
        });
      }

      return NextResponse.json({ chapters: sortedChapters });
      
    } catch (axiosError) {
      // Handle axios-specific errors
      if (axios.isAxiosError(axiosError)) {
        const status = axiosError.response?.status;
        const message = axiosError.message;
        return NextResponse.json({ 
          error: `Failed to fetch website: ${message}${status ? ` (Status: ${status})` : ''}`
        }, { status: 500 });
      }
      throw axiosError; // Re-throw if not an axios error
    }
    
  } catch (error) {
    console.error('Scraping error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to scrape the chapter index';
    return NextResponse.json({
      error: errorMessage,
      chapters: []
    }, { status: 500 });
  }
}