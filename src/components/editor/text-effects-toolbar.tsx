// src/components/editor/text-effects-toolbar.tsx
import React, { RefObject } from 'react';
import { Button } from '@/components/ui/button';
import { Bold, Italic, Strikethrough, Code, Type, Quote, Heading2, List, ListOrdered } from 'lucide-react';
import { toast } from 'sonner'; // Import toast for feedback

const EFFECT_BUTTONS = [
  // Volume/Intensity
  { tag: 'shout', label: 'Shout', icon: '📣' },
  { tag: 'whisper', label: 'Whisper', icon: '🤫' },
  { tag: 'loud', label: 'Loud', icon: '🔊' },
  { tag: 'quiet', label: 'Quiet', icon: '🔈' },
  // Emotion
  { tag: 'tremble', label: 'Tremble', icon: '🥶' },
  { tag: 'fear', label: 'Fear', icon: '😨' },
  { tag: 'joy', label: 'Joy', icon: '😊' },
  { tag: 'anger', label: 'Anger', icon: '😠' },
  { tag: 'sadness', label: 'Sadness', icon: '😢' },
  // Timing/Pacing
  { tag: 'fast', label: 'Fast', icon: '⏩' },
  { tag: 'slow', label: 'Slow', icon: '🐌' },
  { tag: 'stutter', label: 'Stutter', icon: '🗣️' },
  { tag: 'pause', label: 'Pause', icon: '…' },
  // Mental State/Voice
  { tag: 'thought', label: 'Thought', icon: '🤔' },
  { tag: 'dream', label: 'Dream', icon: '몽' }, // Example unique icon
  { tag: 'robotic', label: 'Robotic', icon: '🤖' },
  { tag: 'weak', label: 'Weak', icon: '📉' },
  { tag: 'ghostly', label: 'Ghostly', icon: '👻' },
  // Stylistic
  { tag: 'emphasis', label: 'Emphasis', icon: <Bold size={16}/> }, // Use Lucide icon
  { tag: 'fade', label: 'Fade', icon: '🌫️' },
  { tag: 'fadein', label: 'Fade In', icon: '📈' },
  { tag: 'fadeout', label: 'Fade Out', icon: '📉' },
  { tag: 'echo', label: 'Echo', icon: '(((o)))' }, // Example icon
  { tag: 'distant', label: 'Distant', icon: '🗺️' },
  // Special
  { tag: 'hesitate', label: 'Hesitate', icon: '❓' },
  { tag: 'impact', label: 'Impact', icon: '💥' },
  { tag: 'underwater', label: 'Underwater', icon: '🌊' },
  { tag: 'radio', label: 'Radio', icon: '📻' },
];

interface TextEffectsToolbarProps {
  editorRef: RefObject<HTMLTextAreaElement | null>;
  setContent: (value: string | ((prev: string) => string)) => void;
  disabled?: boolean;
}

export default function TextEffectsToolbar({ editorRef, setContent, disabled = false }: TextEffectsToolbarProps) {

  const applyTag = (tag: string) => {
    const textarea = editorRef.current;
    if (!textarea) {
        toast.error("Editor is not ready.");
        console.warn("Textarea ref not available yet.");
        return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const tagStart = `[${tag}]`;
    const tagEnd = `[${tag}]`; // Using same tag for start/end based on examples

    let newText = '';
    let finalCursorPos = start;

    if (selectedText) {
      // Wrap selected text
      newText = `${tagStart}${selectedText}${tagEnd}`;
      finalCursorPos = start + newText.length; // Position cursor after the inserted tags+text
    } else {
      // Insert tags with cursor in the middle
      newText = `${tagStart}${tagEnd}`;
      finalCursorPos = start + tagStart.length; // Position cursor between tags
    }

    // Update content using the callback function for safety with state updates
    setContent(currentContent => {
        const before = currentContent.substring(0, start);
        const after = currentContent.substring(end);
        return before + newText + after;
    });


    // Use requestAnimationFrame to ensure state update has likely processed
    requestAnimationFrame(() => {
      if (editorRef.current) {
          editorRef.current.focus();
          editorRef.current.setSelectionRange(finalCursorPos, finalCursorPos);
      }
    });
  };

  return (
    <div className="flex flex-wrap gap-1 p-2 border rounded-md bg-muted">
      {EFFECT_BUTTONS.map(({ tag, label, icon }) => (
        <Button
          key={tag}
          variant="ghost"
          size="sm"
          onClick={() => applyTag(tag)}
          title={label}
          disabled={disabled}
          className="px-2 py-1 h-auto text-muted-foreground hover:bg-background hover:text-foreground"
          aria-label={`Apply ${label} effect`} // Add aria-label for accessibility
        >
          {typeof icon === 'string' ? <span className="text-base leading-none align-middle">{icon}</span> : icon}
        </Button>
      ))}
    </div>
  );
}