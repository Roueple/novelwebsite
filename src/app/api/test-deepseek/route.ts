// src/app/api/test-deepseek/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Simple DeepSeek API test
 */
export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json();
    const { text } = body;

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // Get API key
    const apiKey = process.env.DEEPSEEK_API_KEY;

    // If no API key, return mock response
    if (!apiKey) {
      console.log('No DeepSeek API key found, returning mock response');
      return NextResponse.json({ 
        result: 'MOCK RESPONSE: No API key configured',
        mockMode: true
      });
    }

    // Make simple request to DeepSeek API
    try {
      console.log('Making test request to DeepSeek API');
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-reasoner',
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: text }
          ],
          temperature: 1.0,
          max_tokens: 150
        })
      });

      // Parse response
      const responseData = await response.json();
      
      // Handle API error
      if (!response.ok) {
        console.error('DeepSeek API error:', responseData);
        return NextResponse.json({ 
          error: `DeepSeek API error: ${response.status} ${response.statusText}`,
          details: responseData
        }, { status: 500 });
      }
      
      // Return success response
      return NextResponse.json({ 
        result: responseData.choices?.[0]?.message?.content || 'No content in response',
        model: responseData.model || 'unknown',
        success: true
      });
    } catch (apiError) {
      console.error('Error calling DeepSeek API:', apiError);
      return NextResponse.json({ 
        error: 'Failed to call DeepSeek API',
        message: apiError instanceof Error ? apiError.message : String(apiError)
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Request processing error:', error);
    return NextResponse.json({ 
      error: 'Failed to process request',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}