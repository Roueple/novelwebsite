// src/app/admin/text-effects/page.tsx
"use client";

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import AdminRoleCheck from '@/components/auth/admin-role-check';
import TextEffectsExample from '@/components/reading/text-effects-example';
import TextEffectsTest from '@/components/reading/text-effects-test';

export default function TextEffectsPage() {
  const [activeTab, setActiveTab] = useState<string>('test');

  return (
    <AdminRoleCheck>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-theme-foreground">
          Dynamic Text Effects
        </h1>

        <Tabs defaultValue="test" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-8">
            <TabsTrigger value="test">Test Effects</TabsTrigger>
            <TabsTrigger value="guide">Effects Guide</TabsTrigger>
          </TabsList>
          
          <TabsContent value="test" className="mt-6">
            <TextEffectsTest />
          </TabsContent>
          
          <TabsContent value="guide" className="mt-6">
            <div className="max-w-4xl mx-auto">
              <div className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Dynamic Text Effects Guide</h2>
                <p className="text-lg mb-4">
                  This feature enhances the reading experience by allowing text to visually reflect 
                  the tone, emotion, and action in the story.
                </p>
                <p className="mb-4">
                  Authors can use special tags in their text to create dynamic visual effects. 
                  Readers can toggle these effects on/off in their reading settings.
                </p>
              </div>
              
              <TextEffectsExample />
              
              <div className="mt-12 bg-muted/20 p-6 rounded-lg border">
                <h3 className="text-xl font-semibold mb-4">Implementation Notes</h3>
                <ul className="space-y-3 list-disc pl-6">
                  <li>
                    <strong>Performance:</strong> All effects are implemented using CSS rather than JavaScript 
                    animations where possible to ensure smooth performance even on mobile devices.
                  </li>
                  <li>
                    <strong>Accessibility:</strong> The effects are designed to be subtle enough not to interfere 
                    with readability, and users can disable them entirely if desired.
                  </li>
                  <li>
                    <strong>Browser Support:</strong> All effects are tested across modern browsers. Older browsers 
                    will gracefully degrade to standard text display.
                  </li>
                  <li>
                    <strong>Mobile Optimization:</strong> Animations are automatically simplified on mobile 
                    devices to conserve battery and ensure smooth performance.
                  </li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminRoleCheck>
  );
}