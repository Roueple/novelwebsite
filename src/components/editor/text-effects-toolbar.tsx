// src/components/editor/text-effects-toolbar.tsx
import React, { RefObject } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Full list of effects (kept for easy re-activation)
const ALL_EFFECT_BUTTONS = [
  { tag: 'shout', label: 'Shout' }, { tag: 'whisper', label: 'Whisper' },
  { tag: 'loud', label: 'Loud' }, { tag: 'quiet', label: 'Quiet' },
  { tag: 'tremble', label: 'Tremble' }, { tag: 'fear', label: 'Fear' },
  { tag: 'joy', label: 'Joy' }, { tag: 'anger', label: 'Anger' },
  { tag: 'sadness', label: 'Sadness' }, { tag: 'fast', label: 'Fast' },
  { tag: 'slow', label: 'Slow' }, { tag: 'stutter', label: 'Stutter' },
  { tag: 'pause', label: 'Pause' }, { tag: 'thought', label: 'Thought' },
  { tag: 'dream', label: 'Dream' }, { tag: 'robotic', label: 'Robotic' },
  { tag: 'weak', label: 'Weak' }, { tag: 'ghostly', label: 'Ghostly' },
  { tag: 'emphasis', label: 'Emphasis' }, { tag: 'fade', label: 'Fade' },
  { tag: 'fadein', label: 'Fade In' }, { tag: 'fadeout', label: 'Fade Out' },
  { tag: 'echo', label: 'Echo' }, { tag: 'distant', label: 'Distant' },
  { tag: 'hesitate', label: 'Hesitate' }, { tag: 'impact', label: 'Impact' },
  { tag: 'underwater', label: 'Underwater' }, { tag: 'radio', label: 'Radio' },
];

// Define the 7 effects to display
const DISPLAYED_EFFECT_TAGS = ['shout', 'whisper', 'emphasis', 'thought', 'tremble', 'anger', 'joy'];

// Filter the full list to get only the ones we want to display
const DISPLAYED_EFFECT_BUTTONS = ALL_EFFECT_BUTTONS.filter(effect =>
  DISPLAYED_EFFECT_TAGS.includes(effect.tag)
);


interface TextEffectsToolbarProps {
  editorRef: RefObject<HTMLTextAreaElement | null>;
  setContent: (value: string | ((prev: string) => string)) => void;
  disabled?: boolean; // Receives true when preview is shown or saving
}

export default function TextEffectsToolbar({ editorRef, setContent, disabled = false }: TextEffectsToolbarProps) {

  // applyTag function remains the same, it can handle any tag
  const applyTag = (tag: string) => {
    if (disabled) return;
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
    const tagEnd = `[${tag}]`;

    let newText = '';
    let finalCursorPos = start;

    if (selectedText) {
      newText = `${tagStart}${selectedText}${tagEnd}`;
      finalCursorPos = start + newText.length;
    } else {
      newText = `${tagStart}${tagEnd}`;
      finalCursorPos = start + tagStart.length;
    }

    setContent(currentContent => {
        const before = currentContent.substring(0, start);
        const after = currentContent.substring(end);
        return before + newText + after;
    });

    // Delay focus and cursor positioning slightly
    requestAnimationFrame(() => {
      if (editorRef.current) {
          editorRef.current.focus();
          editorRef.current.setSelectionRange(finalCursorPos, finalCursorPos);
      }
    });
  };

  return (
    // Toolbar container is always visible
    <div className="flex flex-wrap gap-1 p-2 border rounded-md bg-muted">
      {/* Map over the FILTERED list */}
      {DISPLAYED_EFFECT_BUTTONS.map(({ tag, label }) => (
        <Button
          key={tag}
          variant="ghost"
          size="sm"
          onClick={() => applyTag(tag)}
          title={`Apply ${label} effect`}
          disabled={disabled} // Button is functionally disabled here
          className={cn(
            "px-2 py-1 h-auto text-xs font-medium",
            "hover:bg-background",
            // Apply standard disabled styling (Tailwind handles this via disabled:opacity-50)
            {"cursor-not-allowed": disabled} // Ensure cursor changes
          )}
          aria-label={`Apply ${label} effect`}
        >
          {/* Text inside the button - REMOVED effect class to fix theme color */}
          <span>
             {label}
          </span>
        </Button>
      ))}
      {/* Optional: Add a hint or button to show more effects later */}
      {/* <Button variant="ghost" size="sm" className="text-xs italic text-muted-foreground" disabled={disabled}>...</Button> */}
    </div>
  );
}