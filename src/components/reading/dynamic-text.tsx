// src/components/reading/dynamic-text.tsx
import React, { memo } from 'react';
import { cn } from '@/lib/utils';

interface DynamicTextProps {
  content: string | null; // <-- MODIFIED: Accept null
  isEnabled: boolean; // This prop controls whether *any* dynamic effects are applied
}

// Map of [effect] markers and their corresponding CSS classes
const EFFECT_MARKERS: Record<string, string> = {
  '[shout]': 'effect-shout', '[whisper]': 'effect-whisper', '[loud]': 'effect-loud',
  '[quiet]': 'effect-quiet', '[tremble]': 'effect-tremble', '[fear]': 'effect-fear',
  '[joy]': 'effect-joy', '[anger]': 'effect-anger', '[sadness]': 'effect-sadness',
  '[fast]': 'effect-fast', '[slow]': 'effect-slow', '[stutter]': 'effect-stutter',
  '[pause]': 'effect-pause', '[thought]': 'effect-thought', '[dream]': 'effect-dream',
  '[robotic]': 'effect-robotic', '[weak]': 'effect-weak', '[ghostly]': 'effect-ghostly',
  '[emphasis]': 'effect-emphasis', '[fade]': 'effect-fade', '[fadein]': 'effect-fadein',
  '[fadeout]': 'effect-fadeout', '[echo]': 'effect-echo', '[distant]': 'effect-distant',
  '[hesitate]': 'effect-hesitation', '[impact]': 'effect-impact', '[underwater]': 'effect-underwater',
  '[radio]': 'effect-radio',
};

// Using memo to prevent re-renders when parent components change but props don't
const DynamicText = memo(function DynamicText({ content, isEnabled }: DynamicTextProps) {

  // *** FIX: Handle null content explicitly at the beginning ***
  if (content === null) {
    // Should ideally be handled by the parent (ReadingView showing locked message),
    // but return empty paragraph as a fallback if called with null.
    return <p className="mb-6 leading-relaxed text-muted-foreground italic">[Content not available]</p>;
  }
  // *** End FIX ***

  // If effects disabled, return simple text wrapped in paragraphs
  if (!isEnabled) {
    const basicHtml = content
        .split(/\n+/) // Split into paragraphs based on one or more newlines
        .map(p => `<p class="mb-6 leading-relaxed">${p.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;") || ' '}</p>`) // Sanitize basic HTML tags and handle empty lines
        .join('');
    return <div dangerouslySetInnerHTML={{ __html: basicHtml }} />;
  }

  // Split by paragraphs first to maintain structure
  const paragraphs = content.split(/\n+/);

  // Process each paragraph for effects
  const processedParagraphs = paragraphs.map((paragraph, index) => {
    // Skip processing for empty paragraphs but render a placeholder for spacing
    if (!paragraph.trim()) {
        // Return non-breaking space inside paragraph for spacing
        return <p key={index} className="mb-6 leading-relaxed">&nbsp;</p>;
    }

    let processedText = paragraph.trim();

    // Apply Markdown-style Bold and Italic FIRST
    // Important: Process italics (**) before bold (*) to handle nesting/adjacency
    processedText = processedText.replace(/\*\*(.*?)\*\*/g, '<span class="font-bold">$1</span>'); // Bold
    processedText = processedText.replace(/\*(.*?)\*/g, '<span class="italic">$1</span>');       // Italic

    // Apply [Effect] tags AFTER markdown styles
    Object.entries(EFFECT_MARKERS).forEach(([marker, className]) => {
      const escapedMarker = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Use non-greedy matching (.*?) to handle multiple effects on one line
      const regex = new RegExp(`${escapedMarker}(.*?)${escapedMarker}`, 'g');
      processedText = processedText.replace(regex, `<span class="${className}">$1</span>`);
    });

    // Return the processed paragraph using dangerouslySetInnerHTML
    return (
      <p
        key={index}
        className="mb-6 leading-relaxed" // Standard paragraph styling
        dangerouslySetInnerHTML={{ __html: processedText }} // Render the processed HTML
      />
    );
  });

  // Render the array of processed paragraphs
  return <>{processedParagraphs}</>;
});

// Add display name for React DevTools
DynamicText.displayName = 'DynamicText';

export default DynamicText;