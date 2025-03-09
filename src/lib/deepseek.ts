// src/lib/deepseek.ts
import { TranslationRequest } from '@/types/translation';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

interface DeepseekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface DeepseekOptions {
  model: string;
  messages: DeepseekMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export async function translate(req: TranslationRequest, streaming = false): Promise<Response> {
  const { sourceText, examples, persistentPrompt, tempPrompt } = req;
  
  // Build system prompt with persistent prompt
  const systemPrompt = `You are a professional Korean to English translator specializing in novels and web novels. 
Your task is to translate the Korean text into natural, flowing English while preserving the original meaning, tone, and style.

${persistentPrompt || ''}

Here are some guidelines:
- Maintain the literary flow and style of the novel
- Preserve character names and special terms consistently
- Do not summarize or skip content
- Translate idioms appropriately to maintain meaning`;

  // Build user prompt with examples (few-shot learning)
  let examplesText = '';
  if (examples && examples.length > 0) {
    examplesText = 'Here are examples of my preferred translation style:\n\n';
    
    examples.forEach((example, index) => {
      examplesText += `Example ${index + 1}:\nKorean: ${example.source}\nEnglish: ${example.target}\n\n`;
    });
  }

  // Add chapter-specific prompt
  const userPrompt = `${examplesText}
${tempPrompt ? `For this specific chapter, please: ${tempPrompt}\n\n` : ''}
Please translate the following Korean text into English:

${sourceText}`;

  const messages: DeepseekMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  const options: DeepseekOptions = {
    model: 'deepseek-reasoner', // Using DeepSeek-R1
    messages,
    temperature: 0.3,
    max_tokens: 8000, // Maximum output tokens
    stream: streaming
  };

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY not configured');
  }

  return fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(options)
  });
}