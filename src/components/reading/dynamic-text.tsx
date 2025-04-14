// src/components/reading/dynamic-text.tsx
import React, { memo } from 'react';

interface DynamicTextProps {
  content: string;
  isEnabled: boolean;
}

// Map of effect markers and their corresponding CSS classes
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
  '[pause]': 'effect-pause', // Note: pause often uses ::after pseudo-element

  // Mental State/Voice
  '[thought]': 'effect-thought',
  '[dream]': 'effect-dream',
  '[robotic]': 'effect-robotic',
  '[weak]': 'effect-weak',
  '[ghostly]': 'effect-ghostly',

  // Stylistic
  '[emphasis]': 'effect-emphasis',
  '[fade]': 'effect-fade',
  '[fadein]': 'effect-fadein',
  '[fadeout]': 'effect-fadeout',
  '[echo]': 'effect-echo',
  '[distant]': 'effect-distant',

  // Additional effects
  '[hesitate]': 'effect-hesitation', // Alias for hesitation? Check CSS
  '[impact]': 'effect-impact',
  '[underwater]': 'effect-underwater',
  '[radio]': 'effect-radio',
};

// Using memo to prevent re-renders when parent components change but props don't
const DynamicText = memo(function DynamicText({ content, isEnabled }: DynamicTextProps) {
  // If effects disabled, or no content, return simple text without processing
  if (!isEnabled || !content) {
    // Use dangerouslySetInnerHTML to render basic paragraphs from newlines
    const basicHtml = content
        .split(/\n+/) // Split into paragraphs based on one or more newlines
        .map(p => `<p class="mb-6 leading-relaxed">${p || ' '}</p>`) // Wrap each in a <p> tag, handle empty lines
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

    let processedText = paragraph;

    // Iterate through defined markers and apply corresponding spans
    Object.entries(EFFECT_MARKERS).forEach(([marker, className]) => {
      // Escape special characters in the marker for regex use
      const escapedMarker = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // Regex Explanation:
      // ${escapedMarker} - Matches the opening tag (e.g., \[shout\])
      // (.*?)           - Captures any characters non-greedily (the content inside the tags)
      // ${escapedMarker} - Matches the closing tag (same as opening)
      // 'g' flag        - Global match, replaces all occurrences
      const regex = new RegExp(`${escapedMarker}(.*?)${escapedMarker}`, 'g');

      // Replace matched patterns with a span having the effect class
      // $1 refers to the captured group (the text content between the tags)
      processedText = processedText.replace(regex, `<span class="${className}">$1</span>`);
    });

    // Optional: Basic dialogue styling (can be refined)
    // Check if the processed paragraph (after applying effects) starts with a quote
    if (processedText.trim().startsWith('"') && processedText.trim().endsWith('"')) {
      processedText = `<span class="dialogue">${processedText}</span>`;
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