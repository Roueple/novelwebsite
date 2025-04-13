// src/components/reading/dynamic-text.tsx
import React, { memo } from 'react';

interface DynamicTextProps {
  content: string;
  isEnabled: boolean;
}

// Map of effect markers and their corresponding classes
const EFFECT_MARKERS = {
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
  '[emphasis]': 'effect-emphasis',
  '[fade]': 'effect-fade',
  '[fadein]': 'effect-fadein',
  '[fadeout]': 'effect-fadeout',
  '[echo]': 'effect-echo',
  '[distant]': 'effect-distant',
  
  // Additional effects
  '[hesitate]': 'effect-hesitation',
  '[impact]': 'effect-impact',
  '[underwater]': 'effect-underwater',
  '[radio]': 'effect-radio',
};

// Using memo to prevent re-renders when parent components change but props don't
const DynamicText = memo(function DynamicText({ content, isEnabled }: DynamicTextProps) {
  // If effects disabled, return simple text without processing
  if (!isEnabled || !content) {
    return <div className="whitespace-pre-wrap">{content}</div>;
  }

  // Split by paragraphs to maintain proper paragraph structure
  const paragraphs = content.split(/\n+/);

  // Process each paragraph for effects
  const processedParagraphs = paragraphs.map((paragraph, index) => {
    if (!paragraph.trim()) return <p key={index} className="my-3">&nbsp;</p>;
    
    let processedText = paragraph;
    
    // Replace each marker with a styled span
    Object.entries(EFFECT_MARKERS).forEach(([marker, className]) => {
      // Create a regex that matches the marker followed by any text until the closing marker
      const regex = new RegExp(`${marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(.*?)${marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');
      
      // Replace all instances of this marker with a span of the appropriate class
      processedText = processedText.replace(regex, `<span class="${className}">$1</span>`);
    });

    // Check if paragraph is dialogue (starts with a quotation mark)
    if (processedText.trim().startsWith('"')) {
      processedText = `<span class="dialogue">${processedText}</span>`;
    }

    // Return the processed paragraph
    return (
      <p 
        key={index} 
        className="mb-6 leading-relaxed" 
        dangerouslySetInnerHTML={{ __html: processedText }} 
      />
    );
  });

  return <>{processedParagraphs}</>;
});

export default DynamicText;