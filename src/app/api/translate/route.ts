// src/app/api/translate/route.ts
import { NextRequest } from 'next/server';
import { TranslationRequest } from '@/types/translation';

// Use dynamic rendering to avoid caching
export const dynamic = 'force-dynamic';

/**
 * Forwards the streaming response from DeepSeek to the client
 */
async function forwardStreamingResponse(response: Response): Promise<Response> {
  // Check that we have a readable body
  if (!response.body) {
    throw new Error('Response body is null');
  }
  
  // Create a new ReadableStream to transform the response
  const reader = response.body.getReader();
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            controller.close();
            break;
          }
          
          // Forward the chunks as-is
          controller.enqueue(value);
        }
      } catch (error: unknown) {
        console.error('Error in streaming response:', error);
        controller.error(error);
      }
    }
  });
  
  // Return a new response with the transformed stream
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  });
}

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    let requestData: TranslationRequest & { stream?: boolean };
    
    try {
      requestData = await req.json();
    } catch (error) {
      console.error('Error parsing request JSON:', error);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate required fields
    const { sourceText, examples, persistentPrompt, tempPrompt, stream = false } = requestData;
    
    if (!sourceText || sourceText.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'Source text is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Get API key
    const apiKey = process.env.DEEPSEEK_API_KEY;
    
    if (!apiKey) {
      console.error('⚠️ DEEPSEEK_API_KEY is not configured in environment variables');
      return new Response(
        JSON.stringify({ error: 'DeepSeek API key is not configured. Please contact the administrator.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Build system prompt with persistent prompt
    const systemPrompt = `You are a professional Korean to English translator specializing in novels and web novels. 
Your task is to translate the Korean text into natural, flowing English while preserving the original meaning, tone, and style.

${persistentPrompt || ''}

Here are some guidelines:
- Maintain the literary flow and style of the novel
- Preserve character names and special terms consistently
- Do not summarize or skip content
- Translate idioms appropriately to maintain meaning
- Keep paragraph breaks as in the original text
- Translate sound effects and onomatopoeia appropriately
- Preserve dialogue structure and speaker attribution
- Maintain honorifics where appropriate or adapt them naturally to English`;

    // Build examples for few-shot learning
    let examplesText = '';
    if (examples && examples.length > 0) {
      examplesText = 'Here are examples of my preferred translation style:\n\n';
      
      examples.forEach((example, index) => {
        examplesText += `Example ${index + 1}:\nKorean: ${example.source.trim()}\nEnglish: ${example.target.trim()}\n\n`;
      });
    }

    // Add chapter-specific prompt
    const userPrompt = `${examplesText}
${tempPrompt ? `For this specific chapter, please: ${tempPrompt}\n\n` : ''}
Please translate the following Korean text into English:

${sourceText.trim()}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    // Configure DeepSeek API request
    const options = {
      model: 'deepseek-reasoner',
      messages,
      temperature: 1.3,
      max_tokens: 8000,
      stream,
      top_p: 0.95
    };

    // Make request to DeepSeek API
    try {
      console.log(`Making DeepSeek API request: ${stream ? 'streaming' : 'non-streaming'}`);
      
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(options)
      });
      
      if (!response.ok) {
        // Log error details
        let errorBody: any = null;
        try {
          errorBody = await response.json();
        } catch (err) {
          errorBody = { message: 'Failed to parse error response' };
        }
        
        console.error('DeepSeek API error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorBody
        });
        
        return new Response(
          JSON.stringify({ 
            error: `Translation API error: ${response.status} ${response.statusText}`,
            details: errorBody
          }),
          { status: response.status, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      // For streaming responses, we forward the stream
      if (stream) {
        return forwardStreamingResponse(response);
      }
      
      // For non-streaming, parse the response and extract the translation
      const data = await response.json();
      
      // Extract content - checking both normal content and reasoning_content
      let translation = '';
      
      if (data.choices && data.choices.length > 0) {
        if (data.choices[0].message?.content) {
          translation = data.choices[0].message.content;
        } else if (data.choices[0].message?.reasoning_content) {
          translation = data.choices[0].message.reasoning_content;
        }
      }
      
      return new Response(
        JSON.stringify({ translation }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
      
    } catch (error) {
      console.error('DeepSeek API request error:', error);
      
      return new Response(
        JSON.stringify({ 
          error: error instanceof Error ? error.message : 'Translation service error' 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
  } catch (error) {
    console.error('Translation API error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Translation service error' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}