// src/components/novel-translator/scrape-debugger.tsx

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Globe, Bug, Clipboard, Check } from 'lucide-react';
import { Label } from '@/components/ui/label';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { toast } from 'sonner';
import { ScrapeResult } from '@/types/translation';

const ScrapeDebugger: React.FC = () => {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [rawResponse, setRawResponse] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const testScrape = async () => {
    if (!url.trim()) {
      setResult({ title: '', chapter: null, text: '', error: 'Please enter a URL' });
      return;
    }

    setIsLoading(true);
    setResult(null);
    setRawResponse(null);
    setCopied(false);

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
        setResult({ 
          title: '',
          chapter: null,
          text: '',
          error: `Failed to parse response as JSON. Raw response: ${rawText.substring(0, 200)}...` 
        });
        return;
      }

      if (!response.ok) {
        setResult({ 
          title: '',
          chapter: null,
          text: '',
          error: data.error || `Request failed with status ${response.status}`
        });
      } else {
        setResult(data);
      }
    } catch (error) {
      console.error('Error testing scrape:', error);
      setResult({ 
        title: '',
        chapter: null,
        text: '',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyRawContent = () => {
    if (result?.text) {
      navigator.clipboard.writeText(result.text);
      setCopied(true);
      toast.success('Content copied to clipboard');
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
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
          <Alert className="border-red-500 bg-red-50 dark:bg-red-950/20">
            <AlertDescription className="text-red-700 dark:text-red-300">
              <strong>Error:</strong> {result.error}
            </AlertDescription>
          </Alert>
        )}

        {result && !result.error && (
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <div className="p-2 border rounded-md bg-muted/20">
                {result.title || 'No title found'}
              </div>
            </div>

            <div>
              <Label>Chapter</Label>
              <div className="p-2 border rounded-md bg-muted/20">
                {result.chapter || 'No chapter identified'}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <Label>Content Preview (First 1000 chars)</Label>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={copyRawContent}
                  disabled={!result.text}
                  className="h-7"
                >
                  {copied ? (
                    <Check className="h-4 w-4 mr-1 text-green-500" /> 
                  ) : (
                    <Clipboard className="h-4 w-4 mr-1" />
                  )}
                  Copy All
                </Button>
              </div>
              <div className="p-2 border rounded-md bg-muted/20 h-48 overflow-y-auto font-mono text-sm">
                {result.text 
                  ? result.text.substring(0, 1000) + (result.text.length > 1000 ? '...' : '') 
                  : 'No content extracted'
                }
              </div>
            </div>

            <div>
              <Label>Content Length</Label>
              <div className="p-2 border rounded-md bg-muted/20">
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
            <div className="p-2 border rounded-md bg-muted/20 h-32 overflow-y-auto font-mono text-xs">
              {rawResponse.substring(0, 1000)}
              {rawResponse.length > 1000 ? '...' : ''}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter>
        <div className="text-xs text-muted-foreground">
          Use this tool to debug scraping issues. The raw response can help identify problems.
        </div>
      </CardFooter>
    </Card>
  );
};

export default ScrapeDebugger;