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
  // Create a new cookie store for this request
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });
  
  try {
    // Get session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.error('No session found');
      return NextResponse.json({ error: 'Unauthorized - No session found' }, { status: 401 });
    }
    
    console.log('Session user ID:', session.user.id);
    
    // Check if user is admin - with better error handling
    try {
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
      
      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        return NextResponse.json({ 
          error: 'Error fetching user profile: ' + profileError.message 
        }, { status: 500 });
      }
      
      if (!userProfile) {
        console.error('No user profile found');
        return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
      }
      
      console.log('User role:', userProfile.role);
      
      // For temporary debugging: Allow all logged-in users to use this endpoint
      // Remove this relaxed check later when authentication is working properly
      /*
      if (userProfile.role !== 'admin') {
        return NextResponse.json({ 
          error: 'Admin access required. Your role: ' + userProfile.role 
        }, { status: 403 });
      }
      */
      
    } catch (profileError) {
      console.error('Exception checking profile:', profileError);
      return NextResponse.json({ 
        error: 'Error checking admin status: ' + (profileError instanceof Error ? profileError.message : String(profileError))
      }, { status: 500 });
    }

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
      // Empty catch clause without variable
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    // Debug log
    console.log(`Scraping chapter index from: ${url}`);

    // Fetch the webpage with timeout and proper headers
    try {
      const response = await axios.get(url, {
        timeout: 15000, // 15 seconds timeout
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      const html = response.data;
      const $ = cheerio.load(html);
      
      console.log(`HTML successfully fetched, length: ${html.length}`);
      
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
          /\d+\.html/i, /c\d+/i // Common patterns
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
      
      // Rest of the code remains the same...
      // Look for common chapter list containers first
      const containerSelectors = [
        '.chapter-list', '.chapters', '.toc', 'ul.chapters', 
        '.table-of-contents', '.episode-list', '.novel-toc',
        '#novel-chapters', '.chapter-item', '.novel-content-list',
        '.chapter-items', '.volume-chapters', '.volume', '.chapter_list',
        '.chapter-box', '.chapter-container', '.series-chapters'
      ];
      
      let foundInContainer = false;
      
      for (const selector of containerSelectors) {
        if ($(selector).length) {
          console.log(`Found potential chapter container: ${selector}`);
          
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
                chapter: chapterMatch ? parseInt(chapterMatch[1]) : undefined
              });
            }
          });
          
          if (chapters.length > 5) {
            foundInContainer = true;
            break;
          }
        }
      }
      
      // Rest of the code here...
      // If no chapters found in containers, look for other patterns
      if (!foundInContainer) {
        console.log('No chapters found in standard containers, looking for other patterns');
        
        // Try to identify chapter tables
        $('table').each((i, table) => {
          if (chapters.length > 5) return;
          
          let hasChapterLinks = false;
          let totalLinks = 0;
          
          $(table).find('a').each((j, link) => {
            totalLinks++;
            const href = $(link).attr('href');
            const text = $(link).text().trim();
            
            if (href && text && isLikelyChapterLink(href, text)) {
              hasChapterLinks = true;
            }
          });
          
          // If this table has multiple links and some are chapter links
          if (hasChapterLinks && totalLinks > 3) {
            console.log('Found potential chapter table');
            
            $(table).find('a').each((j, link) => {
              const href = $(link).attr('href');
              if (!href) return;
              
              const text = $(link).text().trim();
              if (!text) return;
              
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
                  chapter: chapterMatch ? parseInt(chapterMatch[1]) : undefined
                });
              }
            });
          }
        });
      }
      
      // Look for generic list patterns
      if (chapters.length < 5) {
        console.log('Trying list patterns');
        
        $('ul, ol').each((i, list) => {
          if (chapters.length > 10) return;
          
          let hasChapterLinks = false;
          let totalItems = 0;
          
          $(list).find('li').each((j, item) => {
            totalItems++;
            const link = $(item).find('a').first();
            const href = link.attr('href');
            const text = link.text().trim();
            
            if (href && text && isLikelyChapterLink(href, text)) {
              hasChapterLinks = true;
            }
          });
          
          // If this list has multiple items and some are chapter links
          if (hasChapterLinks && totalItems > 3) {
            console.log('Found potential chapter list');
            
            $(list).find('li a').each((j, link) => {
              const href = $(link).attr('href');
              if (!href) return;
              
              const text = $(link).text().trim();
              if (!text) return;
              
              // Skip if not likely a chapter link
              if (!isLikelyChapterLink(href, text)) return;
              
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
                  chapter: chapterMatch ? parseInt(chapterMatch[1]) : undefined
                });
              }
            });
          }
        });
      }
      
      // Fallback - look at all links if we still have few chapters
      if (chapters.length < 5) {
        console.log('Using fallback link scanning');
        
        const links = $('a');
        console.log(`Total links on page: ${links.length}`);
        
        links.each((i, el) => {
          const href = $(el).attr('href');
          if (!href) return;
          
          const text = $(el).text().trim();
          if (!text) return;
          
          // Skip if not likely a chapter link
          if (!isLikelyChapterLink(href, text)) return;
          
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
              chapter: chapterMatch ? parseInt(chapterMatch[1]) : undefined
            });
          }
        });
      }

      // Sort chapters by number if possible
      chapters.sort((a, b) => {
        if (typeof a.chapter === 'number' && typeof b.chapter === 'number') {
          return a.chapter - b.chapter;
        }
        return 0;
      });

      console.log(`Found ${chapters.length} possible chapters`);
      
      if (chapters.length === 0) {
        return NextResponse.json({
          error: 'Could not find any chapter links on the page',
          chapters: []
        }, { status: 404 });
      }

      return NextResponse.json({ chapters });
      
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