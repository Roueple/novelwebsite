// src/app/api/translate/route.ts
import { NextRequest } from 'next/server';
import { translate } from '@/lib/deepseek';
import { TranslationRequest } from '@/types/translation';

// Use dynamic rendering to avoid caching
export const dynamic = 'force-dynamic';

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
    
    // Log translation request (without full text for brevity)
    console.log(`Translation request: ${sourceText.length} chars, streaming: ${stream}, examples: ${examples?.length || 0}`);
    
    // Call the DeepSeek translation function
    const response = await translate({
      sourceText,
      examples,
      persistentPrompt,
      tempPrompt
    }, stream);
    
    return response;
    
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