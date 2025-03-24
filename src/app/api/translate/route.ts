// src/app/api/translate/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Use dynamic rendering to avoid caching
export const dynamic = 'force-dynamic';

// Sample mock response for testing without API key
const MOCK_TRANSLATION = `
This is a mock translation response for testing purposes.

[Translator's note: This appears to be part of a Korean web novel describing a character.]

Zero Code, 1st experience begins.

=====================================================
1. Name: Kim Soo-Hyun (Kim Su-hyeon)
2. Class: Regular User (Normal, Sword User, Master)
3. Nation: Korea
4. Clan: -
5. Hometown: Seoul (Grew up in a peaceful environment, Origin: South Korea)
6. Sex: Male (33)
7. Height and Weight: 181.5cm · 75.5kg
`;

/**
 * Simplified POST handler for translation requests
 */
export async function POST(req: NextRequest) {
  try {
    // Parse request body with error handling
    let sourceText: string;
    let stream: boolean = false;
    
    try {
      const body = await req.json();
      sourceText = body.sourceText || '';
      stream = body.stream === true;
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return NextResponse.json({ error: 'Invalid request format' }, { status: 400 });
    }

    if (!sourceText.trim()) {
      return NextResponse.json({ error: 'Source text is required' }, { status: 400 });
    }

    console.log('Translation request received. Length:', sourceText.length, 'Stream:', stream);

    // Support streaming response if requested
    if (stream) {
      try {
        // Create a mock streaming response
        const encoder = new TextEncoder();
        const chunks = MOCK_TRANSLATION.split('\n');
        
        const stream = new ReadableStream({
          start(controller) {
            let i = 0;
            
            function sendChunk() {
              if (i < chunks.length) {
                const chunk = chunks[i] + '\n';
                controller.enqueue(encoder.encode(chunk));
                i++;
                setTimeout(sendChunk, 100); // 100ms delay between chunks
              } else {
                controller.close();
              }
            }
            
            sendChunk();
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
      // Return mock translation as JSON
      return NextResponse.json({ 
        translation: MOCK_TRANSLATION 
      });
    }
  } catch (error: unknown) {
    console.error('Translation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown translation error';
    return NextResponse.json({ 
      error: errorMessage
    }, { status: 500 });
  }
}