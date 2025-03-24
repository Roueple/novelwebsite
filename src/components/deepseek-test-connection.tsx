// src/components/deepseek-test-connection.tsx
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import LoadingSpinner from '@/components/ui/loading-spinner';

export default function DeepSeekTestConnection() {
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    details?: string;
  } | null>(null);

  const testConnection = async () => {
    setIsLoading(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/test-deepseek', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text: "Hello, can you confirm this connection is working? Please respond with a short confirmation." 
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        setTestResult({
          success: false,
          message: `Connection failed: ${data.error || response.statusText}`,
          details: JSON.stringify(data, null, 2)
        });
        return;
      }

      // Check if we got a mock response
      if (data.mockMode) {
        setTestResult({
          success: false,
          message: "API key not configured",
          details: "The system is using mock responses because no DeepSeek API key is configured. Please add the DEEPSEEK_API_KEY environment variable."
        });
        return;
      }

      // Check if we got an actual response from the model
      if (data.result) {
        setTestResult({
          success: true,
          message: "Connection successful",
          details: data.result
        });
      } else {
        setTestResult({
          success: false,
          message: "Unexpected response format",
          details: JSON.stringify(data, null, 2)
        });
      }
    } catch (error) {
      console.error("Test connection error:", error);
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>DeepSeek API Connection</CardTitle>
        <CardDescription>
          Test the connection to the DeepSeek API
        </CardDescription>
      </CardHeader>
      <CardContent>
        {testResult && (
          <Alert className={`mb-4 ${
            testResult.success 
              ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
              : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
          }`}>
            <div className="flex items-center gap-2">
              {testResult.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <AlertDescription className={`font-medium ${
                testResult.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
              }`}>
                {testResult.message}
              </AlertDescription>
            </div>
            {testResult.details && (
              <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="max-h-32 overflow-auto p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs font-mono">
                  {testResult.details}
                </div>
              </div>
            )}
          </Alert>
        )}

        <div className="flex flex-col space-y-4">
          <p className="text-sm text-muted-foreground">
            Click the button below to test the connection to the DeepSeek API. This will verify that your API key is correctly configured.
          </p>
          
          <div className="flex items-center p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
            <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0" />
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              Make sure your <code className="px-1 py-0.5 bg-yellow-100 dark:bg-yellow-800/50 rounded text-xs">DEEPSEEK_API_KEY</code> is set in your environment variables.
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={testConnection} 
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <LoadingSpinner className="mr-2" />
              Testing...
            </>
          ) : (
            'Test Connection'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}