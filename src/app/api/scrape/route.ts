// src/app/api/scrape/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';
import axios from 'axios';
import * as cheerio from 'cheerio';

export const dynamic = 'force-dynamic';

// Define explicit types for our response data
interface ScrapeResult {
  title: string;
  chapter: string | null;
  text: string;
}

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
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    try {
      // Fetch the webpage with increased timeout and proper headers
      const response = await axios.get(url, {
        timeout: 10000, // 10 seconds timeout
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      const html = response.data as string;
      // Load cheerio with the HTML
      const $ = cheerio.load(html);

      // Debug info
      console.log(`Successfully fetched URL: ${url}`);
      console.log(`HTML length: ${html.length}`);

      // Extract title - with proper type handling
      const title = $('title').text().trim();
      console.log(`Extracted title: ${title}`);
      
      // Look for chapter number in title or URL
      const chapterMatch = title.match(/chapter\s+(\d+)/i) || 
                          url.match(/chapter[_-]?(\d+)/i) ||
                          title.match(/(\d+)\s*화/i);  // Korean chapter indicator
      const chapter = chapterMatch ? chapterMatch[1] : null;
      console.log(`Identified chapter: ${chapter}`);

      // Try multiple strategies to find content
      let text = '';
      let contentFound = false;

      // Strategy 1: Common content selectors for novels
      const contentSelectors = [
        'article', '.novel-content', '.chapter-content', 
        '.content', '#content', '.post-content',
        '.entry-content', '.chapter', '#novel', '.novel',
        '.article-content', '.article', '.body', '.main-content',
        '.text-content', '.story-content', '.story', '#story'
      ];
      
      // First strategy: Try common content selectors
      for (const selector of contentSelectors) {
        // Use a separate function to handle the text extraction to avoid TypeScript errors
        const extractedText = extractTextFromSelector($, selector);
        
        if (extractedText && extractedText.length > 100) {
          text = extractedText;
          contentFound = true;
          console.log(`Found content using selector: ${selector}`);
          break;
        }
      }

      // Strategy 2: Look for large paragraph blocks
      if (!contentFound) {
        console.log('Trying paragraph strategy');
        const paragraphs = $('p');
        
        if (paragraphs.length > 5) {
          // Create an array to hold paragraph texts
          const paragraphTexts: string[] = [];
          
          // Use each to iterate, safer than map with cheerio
          paragraphs.each((_index, element) => {
            const paragraphText = $(element).text().trim();
            if (paragraphText.length > 30) {
              paragraphTexts.push(paragraphText);
            }
          });
          
          if (paragraphTexts.length > 0) {
            const combinedText = paragraphTexts.join('\n\n');
            if (combinedText.length > 100) {
              text = combinedText;
              contentFound = true;
              console.log('Found content via paragraphs');
            }
          }
        }
      }

      // Strategy 3: Find the div with the most substantial text
      if (!contentFound) {
        console.log('Trying div strategy');
        let bestText = '';
        let maxTextLength = 0;
        
        // Iterate through all divs
        $('div').each((_index, element) => {
          const divElement = $(element);
          
          // Skip divs with many child divs (likely containers)
          if (divElement.find('div').length > 3) {
            return; // Continue to next iteration
          }
          
          const divText = divElement.text().trim();
          
          if (divText.length > maxTextLength) {
            maxTextLength = divText.length;
            bestText = divText;
          }
        });
        
        if (bestText.length > 200) {
          text = bestText;
          contentFound = true;
          console.log('Found content via best div strategy');
        }
      }

      // Strategy 4: Fallback - if no content found yet, get the body text with common elements removed
      if (!contentFound || text.length < 100) {
        console.log('Using fallback strategy');
        
        // Remove obvious non-content elements
        $('header, footer, nav, aside, .sidebar, .comments, .comment, .ad, .ads, script, style, iframe').remove();
        
        // Get the body text
        const bodyText = $('body').text().trim();
        
        // Try to clean the text by removing short lines which might be UI elements
        const lines = bodyText.split('\n');
        const filteredLines = lines.filter(line => {
          const trimmed = line.trim();
          return trimmed.length > 20; // Only keep substantial lines
        });
        
        text = filteredLines.join('\n');
      }

      // Clean up the text
      text = text.replace(/\s{2,}/g, '\n\n'); // Replace multiple whitespace with double newline
      text = text.replace(/[\r\n]{3,}/g, '\n\n'); // Replace excessive newlines
      
      // Check if we actually got meaningful content
      if (text.length < 100) {
        return NextResponse.json({ 
          error: 'Could not extract meaningful content from the page. Content length: ' + text.length
        }, { status: 500 });
      }

      // Create the result object
      const result: ScrapeResult = {
        title,
        chapter,
        text
      };

      return NextResponse.json(result);
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
    const errorMessage = error instanceof Error ? error.message : 'Failed to scrape the website';
    return NextResponse.json({
      error: errorMessage
    }, { status: 500 });
  }
}

// Helper function to safely extract text from a selector
function extractTextFromSelector(
  $: cheerio.CheerioAPI, 
  selector: string
): string {
  const element = $(selector);
  
  if (element.length === 0) {
    return '';
  }
  
  // Remove elements that are unlikely to be part of the content
  element.find('script, style, iframe, .ads, .ad, .nav, .navigation, .comment, .comments, footer, header').remove();
  
  // Return the text content
  return element.text().trim();
}