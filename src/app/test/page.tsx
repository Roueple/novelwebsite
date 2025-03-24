"use client";

import React, { useState } from 'react';

export default function ApiTestPage() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const testApi = async () => {
    setLoading(true);
    setError("");
    setResult("");
    
    try {
      const response = await fetch('/api/test-deepseek', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: input }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'API request failed');
      }
      
      setResult(data.result || JSON.stringify(data));
    } catch (err) {
      console.error('API test error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto mt-10 p-6 border rounded shadow">
      <h1 className="text-2xl font-bold mb-4">DeepSeek API Test</h1>
      
      <div className="mb-4">
        <label className="block mb-2">Test Input:</label>
        <textarea 
          value={input} 
          onChange={(e) => setInput(e.target.value)}
          className="w-full p-2 border rounded" 
          rows={3}
          placeholder="Enter some text to send to the API"
        />
      </div>
      
      <button 
        onClick={testApi}
        disabled={loading || !input.trim()}
        className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
      >
        {loading ? "Testing..." : "Test API"}
      </button>
      
      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
          Error: {error}
        </div>
      )}
      
      {result && (
        <div className="mt-4">
          <h2 className="font-bold mb-2">Result:</h2>
          <pre className="p-3 bg-gray-100 rounded overflow-auto max-h-60">
            {result}
          </pre>
        </div>
      )}
    </div>
  );
}