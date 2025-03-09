// src/components/novel-translator/scrape-debugger.tsx

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Globe, Bug } from 'lucide-react';
import { Label } from '@/components/ui/label';
import LoadingSpinner from '@/components/ui/loading-spinner';

interface ScrapeResult {
  title?: string;
  chapter?: string | null;
  text?: string;
  error?: string;
}

const ScrapeDebugger: React.FC = () => {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [rawResponse, setRawResponse] = useState<string | null>(null);

  const testScrape = async () => {
    if (!url.trim()) {
      setResult({ error: 'Please enter a URL' });
      return;
    }

    setIsLoading(true);
    setResult(null);
    setRawResponse(null);

    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url })
      });

      // Get the raw response text
      const rawText = await response.text();
      setRawResponse(rawText);

      // Parse the JSON (might fail if it's not valid JSON)
      let data;
      try {
        data = JSON.parse(rawText);
      } catch {
        // Empty catch clause without variable
        setResult({ 
          error: `Failed to parse response as JSON. Raw response: ${rawText.substring(0, 200)}...` 
        });
        return;
      }

      if (!response.ok) {
        setResult({ 
          error: data.error || `Request failed with status ${response.status}`
        });
      } else {
        setResult(data);
      }
    } catch (error) {
      console.error('Error testing scrape:', error);
      setResult({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Bug className="mr-2 h-5 w-5" /> Scrape Debugger
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex space-x-2">
          <div className="flex-1">
            <Label htmlFor="debug-url">URL to Test</Label>
            <Input
              id="debug-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter website URL to test scraping"
            />
          </div>
          <div className="flex items-end">
            <Button onClick={testScrape} disabled={isLoading}>
              {isLoading ? (
                <LoadingSpinner className="mr-2" />
              ) : (
                <Globe className="mr-2 h-4 w-4" />
              )}
              Test Scrape
            </Button>
          </div>
        </div>

        {isLoading && (
          <div className="flex justify-center py-4">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {result?.error && (
          <Alert className="border-red-500 bg-red-50 dark:bg-red-950">
            <AlertDescription className="text-red-700 dark:text-red-300">
              <strong>Error:</strong> {result.error}
            </AlertDescription>
          </Alert>
        )}

        {result && !result.error && (
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <div className="p-2 border rounded-md bg-gray-50 dark:bg-gray-900">
                {result.title || 'No title found'}
              </div>
            </div>

            <div>
              <Label>Chapter</Label>
              <div className="p-2 border rounded-md bg-gray-50 dark:bg-gray-900">
                {result.chapter || 'No chapter identified'}
              </div>
            </div>

            <div>
              <Label>Content Preview (First 500 chars)</Label>
              <div className="p-2 border rounded-md bg-gray-50 dark:bg-gray-900 h-32 overflow-y-auto font-mono text-sm">
                {result.text ? result.text.substring(0, 500) + '...' : 'No content extracted'}
              </div>
            </div>

            <div>
              <Label>Content Length</Label>
              <div className="p-2 border rounded-md bg-gray-50 dark:bg-gray-900">
                {result.text ? result.text.length.toLocaleString() + ' characters' : '0 characters'}
              </div>
            </div>
          </div>
        )}

        {rawResponse && (
          <div>
            <Label className="flex items-center">
              <Bug className="mr-1 h-4 w-4" /> Raw Response (First 1000 chars)
            </Label>
            <div className="p-2 border rounded-md bg-gray-50 dark:bg-gray-900 h-32 overflow-y-auto font-mono text-xs">
              {rawResponse.substring(0, 1000)}
              {rawResponse.length > 1000 ? '...' : ''}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter>
        <div className="text-xs text-gray-500">
          Use this tool to debug scraping issues. The raw response can help identify problems.
        </div>
      </CardFooter>
    </Card>
  );
};

export default ScrapeDebugger;