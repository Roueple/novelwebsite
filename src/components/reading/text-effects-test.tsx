// src/components/reading/text-effects-test.tsx

"use client"; // <-- ADD THIS LINE

import React, { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DynamicText from './dynamic-text';

const SAMPLE_TEXT = `
Chapter 1: The Beginning

The old man's hands [tremble]shook slightly[tremble] as he opened the ancient tome. Dust particles danced in the ray of sunlight that pierced through the library's high windows.

"[whisper]Be careful with that[whisper]," the librarian cautioned from across the room.

He nodded, but his attention was already captured by the [emphasis]strange symbols[emphasis] that adorned the yellowed pages. They seemed to [slow]swim before his eyes[slow], almost as if they were alive.

[thought]What secrets does this book hold?[thought] he wondered, tracing his finger along the intricate patterns.

Suddenly, a [impact]BOOM[impact] echoed through the building, making him jump. The lights flickered, and for a moment, everything was cast in [ghostly]eerie shadows[ghostly].

"[shout]EVERYONE OUT NOW![shout]" came a voice from the corridor.

His heart [fast]raced as he clutched the book to his chest[fast] and made for the exit. Whatever was happening, he couldn't leave this discovery behind.

The ground [tremble]trembled beneath his feet[tremble] as he ran, and somewhere in the distance, he could hear [distant]sirens wailing[distant].

What had he [emphasis]unleashed[emphasis]?
`;

export default function TextEffectsTest() {
  const [text, setText] = useState(SAMPLE_TEXT);
  const [effectsEnabled, setEffectsEnabled] = useState(true);

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Dynamic Text Effects Test</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-end mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm">Effects:</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={effectsEnabled}
                onChange={() => setEffectsEnabled(!effectsEnabled)}
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Edit Panel */}
          <div>
            <h3 className="text-sm font-medium mb-2">Edit Text</h3>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="font-mono text-sm h-[500px]"
              placeholder="Enter text with effect tags like [shout]TEXT[shout]"
            />
            <div className="mt-4 flex justify-between">
              <Button
                variant="outline"
                onClick={() => setText(SAMPLE_TEXT)}
                size="sm"
              >
                Reset to Sample
              </Button>
              <Button
                variant="outline"
                onClick={() => setText('')}
                size="sm"
              >
                Clear
              </Button>
            </div>
          </div>

          {/* Preview Panel */}
          <div>
            <h3 className="text-sm font-medium mb-2">Preview</h3>
            <div className="prose max-w-none p-6 border rounded-md h-[500px] overflow-y-auto">
              <DynamicText content={text} isEnabled={effectsEnabled} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}