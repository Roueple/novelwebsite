"use client";

import React, { useState, useRef } from 'react';

export default function TestTranslationPage() {
  const [sourceText, setSourceText] = useState<string>('');
  const [translation, setTranslation] = useState<string>('');
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingEnabled, setStreamingEnabled] = useState<boolean>(false); // Default to non-streaming for reliability
  
  // For handling abort
  const abortControllerRef = useRef<AbortController | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  const handleTranslate = async () => {
    if (!sourceText.trim()) {
      setError('Please enter text to translate');
      return;
    }

    setIsTranslating(true);
    setTranslation('');
    setError(null);

    // Create a new abort controller for this request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      if (streamingEnabled) {
        // Streaming method
        const response = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceText,
            stream: true
          }),
          signal: abortControllerRef.current.signal
        });

        if (!response.ok) {
          let errorMessage = `Server returned ${response.status}`;
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch {}
          throw new Error(errorMessage);
        }

        // Read the stream
        const reader = response.body?.getReader();
        if (!reader) throw new Error('Stream reader not available');

        const decoder = new TextDecoder();
        let result = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Decode and append chunk
          const chunk = decoder.decode(value, { stream: true });
          result += chunk;
          setTranslation(result);

          // Auto scroll to bottom
          if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
          }
        }
      } else {
        // Non-streaming request
        const response = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceText,
            stream: false
          }),
          signal: abortControllerRef.current.signal
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Translation failed');
        }

        setTranslation(data.translation || JSON.stringify(data));
      }
    } catch (err) {
      console.error('Translation error:', err);
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message);
      }
    } finally {
      if (abortControllerRef.current) {
        abortControllerRef.current = null;
      }
      setIsTranslating(false);
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsTranslating(false);
  };

  return (
    <main className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-3xl font-bold mb-4 text-center">Simple Translation Test</h1>
        <p className="mb-8 text-center text-gray-600">
          Basic test for the DeepSeek API integration
        </p>
        
        <div className="mb-4">
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              id="streaming"
              checked={streamingEnabled}
              onChange={(e) => setStreamingEnabled(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="streaming">Enable streaming response (may be less stable)</label>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Korean Text</h2>
          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder="Enter Korean text to translate"
            className="w-full p-2 border rounded-md h-40 font-mono"
            disabled={isTranslating}
          />
        </div>

        <div className="flex justify-between mb-6">
          <button
            onClick={handleTranslate}
            disabled={isTranslating || !sourceText.trim()}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isTranslating ? "Translating..." : "Translate"}
          </button>

          {isTranslating && (
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
            >
              Cancel
            </button>
          )}
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Translation Result</h2>
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
              Error: {error}
            </div>
          )}
          <div
            ref={outputRef}
            className="w-full p-4 border rounded-md h-80 overflow-auto bg-gray-50 font-mono whitespace-pre-wrap"
          >
            {translation || (
              <span className="text-gray-400">
                Translation will appear here...
              </span>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}