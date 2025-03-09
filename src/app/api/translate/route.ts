// src/app/api/translate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { translate } from '@/lib/deepseek';
import { Database } from '@/types/supabase';

// This is a streaming API route
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
    const { sourceText, examples, persistentPrompt, tempPrompt, stream = false } = await req.json();

    if (!sourceText) {
      return NextResponse.json({ error: 'Source text is required' }, { status: 400 });
    }

    // Support streaming response if requested
    if (stream) {
      // Use ReadableStream for streaming
      const translationResponse = await translate(
        { sourceText, examples, persistentPrompt, tempPrompt },
        true
      );

      // Create a transformer to process the streaming response
      const stream = new ReadableStream({
        async start(controller) {
          if (!translationResponse.body) {
            controller.close();
            return;
          }

          const reader = translationResponse.body.getReader();
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
    console.error('Translation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ 
      error: errorMessage
    }, { status: 500 });
  }
}