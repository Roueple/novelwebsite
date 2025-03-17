// src/lib/deepseek.ts
import { TranslationRequest } from '@/types/translation';

/**
 * DeepSeek API URL
 */
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

/**
 * Message object for DeepSeek API
 */
interface DeepseekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Options for DeepSeek API request
 */
interface DeepseekOptions {
  model: string;
  messages: DeepseekMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  top_p?: number;
}

// Force a value for demo purposes if API key isn't configured
// This is a fallback mechanism for development - should be removed in production
const MOCK_TRANSLATION = `
Zero Code, 1st experience begins.

=====================================================
1. Name: Kim Soo-Hyun (Kim Su-hyeon)
2. Class: Regular User (Normal, Sword User, Master)
3. Nation: Korea
4. Clan: -
5. Hometown: Seoul (Grew up in a peaceful environment, Origin: South Korea)
6. Sex: Male (33)
7. Height and Weight: 181.5cm · 75.5kg

[This appears to be character information for a Korean web novel or game, listing basic attributes of the protagonist. The "Zero Code" mentioned at the beginning might refer to either a system or starting point in the narrative.]
`;

/**
 * Translates Korean text to English using the DeepSeek API
 * No authentication checks
 * 
 * @param req Translation request
 * @param streaming Whether to use streaming
 * @returns API response
 */
export async function translate(req: TranslationRequest, streaming = false): Promise<Response> {
  const { sourceText, examples, persistentPrompt, tempPrompt } = req;
  
  if (!sourceText || sourceText.trim() === '') {
    return new Response(JSON.stringify({ error: 'Source text is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Look for API keys in various environment variable names
  const apiKey = process.env.DEEPSEEK_API_KEY || 
                 process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY || 
                 process.env.OPENAI_API_KEY ||
                 process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  
  // For development/testing - create a mock response if no API key is found
  if (!apiKey) {
    console.warn('⚠️ No API key found! Using mock translation response');
    
    // If streaming was requested, create a mock streaming response
    if (streaming) {
      // Create a ReadableStream that delivers chunks of text
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          // Split the mock translation into chunks and send them with delays
          const chunks = MOCK_TRANSLATION.split('\n');
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
      
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      });
    }
    
    // For non-streaming requests, return the mock translation as JSON
    return new Response(JSON.stringify({ 
      choices: [{ message: { content: MOCK_TRANSLATION } }]
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
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

  const messages: DeepseekMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  // Configure API request options
  const options: DeepseekOptions = {
    model: 'deepseek-reasoner',
    messages,
    temperature: 0.3, // Lower temperature for more consistent translations
    max_tokens: 8000, // Maximum output tokens
    stream: streaming,
    top_p: 0.95
  };

  // Make API request with error handling
  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(options)
    });
    
    return response;
  } catch (error) {
    console.error('DeepSeek API error:', error);
    return new Response(JSON.stringify({ error: 'Translation service error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}