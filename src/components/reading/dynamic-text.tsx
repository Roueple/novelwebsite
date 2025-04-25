// src/components/reading/dynamic-text.tsx
import React, { memo } from 'react';
import { cn } from '@/lib/utils'; // Import cn for potential class combinations

interface DynamicTextProps {
  content: string;
  isEnabled: boolean; // This prop controls whether *any* dynamic effects are applied
}

// Map of [effect] markers and their corresponding CSS classes (Keep this if you want to retain existing effects)
const EFFECT_MARKERS: Record<string, string> = {
  // Volume/Intensity
  '[shout]': 'effect-shout',
  '[whisper]': 'effect-whisper',
  '[loud]': 'effect-loud',
  '[quiet]': 'effect-quiet',
  // Emotion
  '[tremble]': 'effect-tremble',
  '[fear]': 'effect-fear',
  '[joy]': 'effect-joy',
  '[anger]': 'effect-anger',
  '[sadness]': 'effect-sadness',
  // Timing/Pacing
  '[fast]': 'effect-fast',
  '[slow]': 'effect-slow',
  '[stutter]': 'effect-stutter',
  '[pause]': 'effect-pause',
  // Mental State/Voice
  '[thought]': 'effect-thought',
  '[dream]': 'effect-dream',
  '[robotic]': 'effect-robotic',
  '[weak]': 'effect-weak',
  '[ghostly]': 'effect-ghostly',
  // Stylistic
  '[emphasis]': 'effect-emphasis', // Note: You might want italic or bold for emphasis now
  '[fade]': 'effect-fade',
  '[fadein]': 'effect-fadein',
  '[fadeout]': 'effect-fadeout',
  '[echo]': 'effect-echo',
  '[distant]': 'effect-distant',
  // Special
  '[hesitate]': 'effect-hesitation', // Check CSS if this class exists
  '[impact]': 'effect-impact',
  '[underwater]': 'effect-underwater',
  '[radio]': 'effect-radio',
};

// Using memo to prevent re-renders when parent components change but props don't
const DynamicText = memo(function DynamicText({ content, isEnabled }: DynamicTextProps) {
  // If effects disabled, or no content, return simple text wrapped in paragraphs
  if (!isEnabled || !content) {
    const basicHtml = content
        .split(/\n+/) // Split into paragraphs based on one or more newlines
        .map(p => `<p class="mb-6 leading-relaxed">${p.trim() || ' '}</p>`) // Wrap each in a <p> tag, handle empty lines
        .join('');
    return <div dangerouslySetInnerHTML={{ __html: basicHtml }} />;
  }

  // Split by paragraphs first to maintain structure
  const paragraphs = content.split(/\n+/);

  // Process each paragraph for effects
  const processedParagraphs = paragraphs.map((paragraph, index) => {
    // Skip processing for empty paragraphs but render a placeholder for spacing
    if (!paragraph.trim()) {
        return <p key={index} className="mb-6 leading-relaxed"> </p>;
    }

    let processedText = paragraph.trim(); // Start with trimmed paragraph text

    // --- NEW: Apply Markdown-style Bold and Italic ---
    // IMPORTANT: Process double asterisks (italic) BEFORE single (bold)
    // to handle potential nesting or adjacent markers correctly.
    // Regex: \*\*(.*?)\*\* - Finds text wrapped in double asterisks, captures the inner text ($1)
    processedText = processedText.replace(/\*\*(.*?)\*\*/g, '<span class="font-bold">$1</span>');
    // Regex: \*(.*?)\* - Finds text wrapped in single asterisks, captures the inner text ($1)
    processedText = processedText.replace(/\*(.*?)\*/g, '<span class="italic">$1</span>');
    // --- END NEW LOGIC ---

    // --- Keep Existing [Effect] Logic (if you want to retain them) ---
    Object.entries(EFFECT_MARKERS).forEach(([marker, className]) => {
      // Escape special characters in the marker for regex use
      const escapedMarker = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Regex: Matches the opening tag, captures content non-greedily, matches closing tag
      const regex = new RegExp(`${escapedMarker}(.*?)${escapedMarker}`, 'g');
      // Replace with a span having the effect class
      processedText = processedText.replace(regex, `<span class="${className}">$1</span>`);
    });
    // --- End Existing [Effect] Logic ---

    // Optional: Basic dialogue styling (can be refined)
    // Apply after all other replacements
    if (processedText.trim().startsWith('"') && processedText.trim().endsWith('"')) {
      // You might want to only apply this if it hasn't already been wrapped in another span
      // This basic version will wrap the entire line including any effect spans within it.
      // For more complex styling, a more robust parser (like a Markdown parser) might be needed.
      // processedText = `<span class="dialogue">${processedText}</span>`; // Example dialogue class
    }


    // Return the processed paragraph using dangerouslySetInnerHTML
    return (
      <p
        key={index}
        className="mb-6 leading-relaxed" // Standard paragraph styling
        dangerouslySetInnerHTML={{ __html: processedText }}
      />
    );
  });

  // Render the array of processed paragraphs
  return <>{processedParagraphs}</>;
});

export default DynamicText;