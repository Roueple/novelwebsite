// src/app/api/translate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { translate } from '@/lib/deepseek';
import { Database } from '@/types/supabase';
import { TranslationRequest } from '@/types/translation';

// This is a streaming API route
export const dynamic = 'force-dynamic';

/**
 * POST handler for translation requests
 */
export async function POST(req: NextRequest) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });
  
  try {
    // Authentication check
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check user authorization
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json({ 
        error: 'Error checking authorization: ' + profileError.message 
      }, { status: 500 });
    }
    
    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }
    
    // Check if user is authorized (admin or author)
    if (userProfile.role !== 'admin' && userProfile.role !== 'author') {
      return NextResponse.json({ 
        error: 'Insufficient permissions. This feature is for admins and authors.'
      }, { status: 403 });
    }

    try {
      // Parse request body
      const request = await req.json();
      const { sourceText, examples, persistentPrompt, tempPrompt, stream = false } = request as TranslationRequest & { stream?: boolean };

      if (!sourceText) {
        return NextResponse.json({ error: 'Source text is required' }, { status: 400 });
      }

      // Support streaming response if requested
      if (stream) {
        try {
          // Use ReadableStream for streaming
          const translationResponse = await translate(
            { sourceText, examples, persistentPrompt, tempPrompt },
            true
          );

          // Check if response body exists
          if (!translationResponse.body) {
            return NextResponse.json({ 
              error: 'No response body from translation service' 
            }, { status: 500 });
          }

          // Create a transformer to process the streaming response
          const reader = translationResponse.body.getReader();
          
          const stream = new ReadableStream({
            async start(controller) {
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) {
                    controller.close();
                    break;
                  }
                  
                  // Forward the chunk
                  controller.enqueue(value);
                }
              } catch (error) {
                console.error('Stream reading error:', error);
                controller.error(error);
              }
            },
            cancel() {
              reader.cancel();
            }
          });

          // Return streaming response
          return new Response(stream, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache, no-transform',
              'Connection': 'keep-alive'
            }
          });
        } catch (streamError) {
          console.error('Streaming error:', streamError);
          return NextResponse.json({ 
            error: streamError instanceof Error 
              ? streamError.message 
              : 'Error processing streaming translation'
          }, { status: 500 });
        }
      } else {
        // Regular non-streaming response
        const translationResponse = await translate(
          { sourceText, examples, persistentPrompt, tempPrompt },
          false
        );

        const data = await translationResponse.json();

        if (translationResponse.status !== 200) {
          return NextResponse.json({ 
            error: data.error?.message || 'Translation failed' 
          }, { status: translationResponse.status });
        }

        return NextResponse.json({ 
          translation: data.choices[0].message.content 
        });
      }
    } catch (error: unknown) {
      console.error('Translation processing error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Internal server error';
      return NextResponse.json({ 
        error: errorMessage
      }, { status: 500 });
    }
  } catch (error: unknown) {
    console.error('Authentication error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Authentication error';
    return NextResponse.json({ 
      error: errorMessage
    }, { status: 401 });
  }
}