// src/components/editor/text-effects-toolbar.tsx
import React, { RefObject } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// EFFECT_BUTTONS data remains the same
const EFFECT_BUTTONS = [
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


interface TextEffectsToolbarProps {
  editorRef: RefObject<HTMLTextAreaElement | null>;
  setContent: (value: string | ((prev: string) => string)) => void;
  disabled?: boolean; // Receives true when preview is shown or saving
}

export default function TextEffectsToolbar({ editorRef, setContent, disabled = false }: TextEffectsToolbarProps) {

  // applyTag function remains the same
  const applyTag = (tag: string) => {
    // --- This function should NOT run if disabled is true, ---
    // --- because the button itself will be disabled.      ---
    // --- But keep the check just in case.                  ---
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
      {EFFECT_BUTTONS.map(({ tag, label }) => (
        <Button
          key={tag}
          variant="ghost"
          size="sm"
          onClick={() => applyTag(tag)}
          title={`Apply ${label} effect`}
          disabled={disabled} // Button is functionally disabled here
          // --- MODIFICATION: Add visual cue for disabled state ---
          className={cn(
            "px-2 py-1 h-auto text-xs font-medium",
            "hover:bg-background",
            // Apply opacity change when disabled to make it clearer
            // The default disabled:opacity-50 might be sufficient,
            // but we can make it more explicit if needed.
            // Add specific styles for the disabled state *if* the default isn't clear enough:
             {"opacity-60 cursor-not-allowed": disabled} // Example: make it semi-transparent
          )}
          // --- END MODIFICATION ---
          aria-label={`Apply ${label} effect`}
        >
          {/* Inner span still gets the effect class for visual preview */}
          <span className={cn(`effect-${tag}`)}>
             {label}
          </span>
        </Button>
      ))}
    </div>
  );
}