"use client";

import React, { useState, useRef } from 'react';
import { TranslationExample } from '@/types/translation';

const TranslationTester: React.FC = () => {
  const [sourceText, setSourceText] = useState<string>('');
  const [translation, setTranslation] = useState<string>('');
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingEnabled, setStreamingEnabled] = useState<boolean>(true);
  const [examples, setExamples] = useState<TranslationExample[]>([]);
  const [persistentPrompt, setPersistentPrompt] = useState<string>('');
  const [tempPrompt, setTempPrompt] = useState<string>('');
  
  // For streaming
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
        // Handle streaming response
        const response = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceText,
            examples: examples.length > 0 ? examples : undefined,
            persistentPrompt: persistentPrompt || undefined,
            tempPrompt: tempPrompt || undefined,
            stream: true
          }),
          signal: abortControllerRef.current.signal
        });

        if (!response.ok) {
          let errorMessage = `Server returned ${response.status}: ${response.statusText}`;
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
            examples: examples.length > 0 ? examples : undefined,
            persistentPrompt: persistentPrompt || undefined,
            tempPrompt: tempPrompt || undefined,
            stream: false
          }),
          signal: abortControllerRef.current.signal
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Translation failed');
        }

        setTranslation(data.translation);
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

  const addExample = () => {
    setExamples([...examples, { source: '', target: '' }]);
  };

  const updateExample = (index: number, field: 'source' | 'target', value: string) => {
    const newExamples = [...examples];
    newExamples[index][field] = value;
    setExamples(newExamples);
  };

  const removeExample = (index: number) => {
    setExamples(examples.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">DeepSeek Translation Tester</h1>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Settings</h2>
        <div className="flex items-center mb-4">
          <input
            type="checkbox"
            id="streaming"
            checked={streamingEnabled}
            onChange={(e) => setStreamingEnabled(e.target.checked)}
            className="mr-2"
          />
          <label htmlFor="streaming">Enable streaming response</label>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">System Prompt</h2>
        <textarea
          value={persistentPrompt}
          onChange={(e) => setPersistentPrompt(e.target.value)}
          placeholder="Enter global translation instructions here..."
          className="w-full p-2 border rounded-md h-32"
        />
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Examples</h2>
        {examples.map((example, index) => (
          <div key={index} className="flex flex-col md:flex-row gap-2 mb-4 p-2 border rounded-md">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Korean</label>
              <textarea
                value={example.source}
                onChange={(e) => updateExample(index, 'source', e.target.value)}
                placeholder="Korean text"
                className="w-full p-2 border rounded-md h-24"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">English</label>
              <textarea
                value={example.target}
                onChange={(e) => updateExample(index, 'target', e.target.value)}
                placeholder="English translation"
                className="w-full p-2 border rounded-md h-24"
              />
            </div>
            <button
              onClick={() => removeExample(index)}
              className="mt-1 px-2 text-red-500"
              aria-label="Remove example"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          onClick={addExample}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          Add Example
        </button>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Specific Prompt</h2>
        <textarea
          value={tempPrompt}
          onChange={(e) => setTempPrompt(e.target.value)}
          placeholder="Enter specific translation instructions for this text..."
          className="w-full p-2 border rounded-md h-24"
        />
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
        <h2 className="text-xl font-semibold mb-2">Translation</h2>
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
  );
};

export default TranslationTester;