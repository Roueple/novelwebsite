import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Check available environment variables (safely)
  const envVars = {
    hasDeepseekApiKey: !!process.env.DEEPSEEK_API_KEY,
    hasNextPublicDeepseekApiKey: !!process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY,
    // List other environment variable names (but not values)
    availableEnvVars: Object.keys(process.env)
      .filter(key => 
        key.includes('DEEPSEEK') || 
        key.includes('API_KEY') || 
        key.startsWith('NEXT_PUBLIC_')
      )
      .map(key => {
        // Only return the name, not the value, for security
        return `${key}: ${key.includes('KEY') ? '[REDACTED]' : process.env[key]}`;
      })
  };
  
  return NextResponse.json(envVars);
}