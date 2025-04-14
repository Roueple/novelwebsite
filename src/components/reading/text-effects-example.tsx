// src/components/reading/text-effects-example.tsx
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Sparkles, Copy } from 'lucide-react';
import DynamicText from './dynamic-text';
import { toast } from 'sonner'; // Import toast for copy feedback
import { cn } from '@/lib/utils'; // Import cn

// EFFECT_EXAMPLES definition remains the same
const EFFECT_EXAMPLES = {
  volume: [
    { name: 'Shout', tag: '[shout]', example: '[shout]WATCH OUT![shout]' },
    { name: 'Whisper', tag: '[whisper]', example: '[whisper]Don\'t let them hear us...[whisper]' },
    { name: 'Loud', tag: '[loud]', example: '[loud]Everyone, listen up![loud]' },
    { name: 'Quiet', tag: '[quiet]', example: '[quiet]I don\'t want to disturb anyone.[quiet]' },
  ],
  emotion: [
    { name: 'Tremble', tag: '[tremble]', example: 'She could barely hold the letter, her hands [tremble]shaking uncontrollably[tremble].' },
    { name: 'Fear', tag: '[fear]', example: 'The shadows seemed to [fear]move on their own[fear].' },
    { name: 'Joy', tag: '[joy]', example: 'Her heart was [joy]bursting with happiness[joy].' },
    { name: 'Anger', tag: '[anger]', example: '"[anger]How dare you![anger]" he shouted.' },
    { name: 'Sadness', tag: '[sadness]', example: 'Tears ran down her [sadness]grief-stricken[sadness] face.' },
  ],
  timing: [
    { name: 'Fast', tag: '[fast]', example: 'He [fast]sprinted across the room[fast] before anyone could stop him.' },
    { name: 'Slow', tag: '[slow]', example: 'Time seemed to [slow]stretch into eternity[slow].' },
    { name: 'Stutter', tag: '[stutter]', example: '"I-I [stutter]didn\'t mean to[stutter]," she stammered.' },
    { name: 'Pause', tag: '[pause]', example: 'She hesitated[pause] and then continued.' },
  ],
  mental: [
    { name: 'Thought', tag: '[thought]', example: '[thought]What if they discover the truth?[thought] she wondered.' },
    { name: 'Dream', tag: '[dream]', example: '[dream]She was flying over mountains and oceans[dream].' },
    { name: 'Robotic', tag: '[robotic]', example: '[robotic]SYSTEM MALFUNCTION. REBOOTING.[robotic]' },
    { name: 'Weak', tag: '[weak]', example: '"I feel [weak]so tired[weak]," the patient whispered.' },
    { name: 'Ghostly', tag: '[ghostly]', example: '[ghostly]Remember what you promised...[ghostly]' },
  ],
  stylistic: [
    { name: 'Emphasis', tag: '[emphasis]', example: 'This is [emphasis]absolutely critical[emphasis] to understand.' },
    { name: 'Fade', tag: '[fade]', example: 'His voice [fade]trailed off into silence[fade].' },
    { name: 'Fade In', tag: '[fadein]', example: '[fadein]Consciousness returned slowly[fadein].' },
    { name: 'Fade Out', tag: '[fadeout]', example: 'The world around her [fadeout]began to disappear[fadeout].' },
    { name: 'Echo', tag: '[echo]', example: '[echo]Hello... hello... hello...[echo]' },
    { name: 'Distant', tag: '[distant]', example: 'He could hear [distant]voices from downstairs[distant].' },
  ],
  special: [
    { name: 'Hesitate', tag: '[hesitate]', example: '"I... [hesitate]I\'m not sure[hesitate]," she admitted.' },
    { name: 'Impact', tag: '[impact]', example: 'The hammer [impact]CRASHED[impact] down.' },
    { name: 'Underwater', tag: '[underwater]', example: '[underwater]Everything sounded muffled and distant[underwater].' },
    { name: 'Radio', tag: '[radio]', example: '[radio]*ksssh* Come in, over! *ksssh*[radio]' },
  ]
};


export default function TextEffectsExample() {
  // Function to copy text to clipboard
  const copyToClipboard = (text: string) => {
     try {
        navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard!"); // Provide user feedback
     } catch (err) {
         console.error("Failed to copy text: ", err);
         toast.error("Failed to copy text.");
     }
  };

  return (
    // --- MODIFICATION START ---
    // Explicitly add theme classes to ensure contrast within the dialog
    <Card className={cn(
        "mb-8", // Keep existing margin if needed
        "bg-card text-card-foreground border-border" // Add explicit theme classes
    )}>
    {/* --- MODIFICATION END --- */}
      <CardHeader className="flex flex-row items-center justify-between pb-4"> {/* Adjusted padding */}
        <CardTitle className="flex items-center gap-2 text-lg"> {/* Adjusted size */}
          <Sparkles size={18} className="text-yellow-500" />
          <span>Dynamic Text Effects Guide</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Ensure paragraph text uses foreground color */}
        <p className="mb-4 text-sm text-foreground">
          Enhance your writing with dynamic text effects by using special tags.
          Wrap your text in tags like <code className="bg-muted px-1 py-0.5 rounded text-muted-foreground">[effect]your text[effect]</code> to apply visual styles.
        </p>

        <Tabs defaultValue="volume" className="mt-6">
          {/* Ensure TabsList uses theme colors */}
          <TabsList className="mb-4 bg-muted text-muted-foreground">
            <TabsTrigger value="volume" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Volume</TabsTrigger>
            <TabsTrigger value="emotion" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Emotion</TabsTrigger>
            <TabsTrigger value="timing" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Timing</TabsTrigger>
            <TabsTrigger value="mental" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Mental</TabsTrigger>
            <TabsTrigger value="stylistic" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Stylistic</TabsTrigger>
            <TabsTrigger value="special" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Special</TabsTrigger>
          </TabsList>

          {Object.entries(EFFECT_EXAMPLES).map(([category, effects]) => (
            <TabsContent key={category} value={category} className="space-y-4">
              {effects.map((effect) => (
                // Ensure inner borders and text use theme colors
                <div key={effect.tag} className="border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-foreground">{effect.name}</h3>
                    <Button
                      variant="outline" // Uses theme outline style
                      size="sm"
                      onClick={() => copyToClipboard(effect.example)}
                      className="flex items-center gap-1 text-xs"
                    >
                      <Copy size={14} />
                      <span>Copy Example</span>
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Tag: <code className="bg-muted px-1 py-0.5 rounded text-muted-foreground">{effect.tag}</code>
                  </p>
                  {/* Ensure preview area uses theme colors */}
                  <div className="bg-muted/50 p-3 rounded-md mt-3 border border-border/50">
                     {/* DynamicText itself should inherit foreground color */}
                    <DynamicText content={effect.example} isEnabled={true} />
                  </div>
                </div>
              ))}
            </TabsContent>
          ))}
        </Tabs>

        {/* Ensure Tips section uses theme colors */}
        <div className="mt-6 border-t border-border pt-4">
          <h3 className="font-medium mb-2 text-foreground">Tips for Using Text Effects</h3>
          <ul className="text-sm space-y-2 list-disc pl-5 text-muted-foreground">
            <li>Use effects sparingly for maximum impact.</li>
            <li>Combine different effects to create unique expressions.</li>
            <li>Effects can be nested, but avoid overdoing it.</li>
            <li>Dynamic text will be rendered for readers who have effects enabled.</li>
            <li>Readers can toggle effects on/off in their reading settings.</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}