// src/components/editor/text-effects-toolbar.tsx
import React, { RefObject } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils'; // Import cn for combining classes

// Keep the EFFECT_BUTTONS data structure as it already has tag and label
const EFFECT_BUTTONS = [
  // Volume/Intensity
  { tag: 'shout', label: 'Shout' },
  { tag: 'whisper', label: 'Whisper' },
  { tag: 'loud', label: 'Loud' },
  { tag: 'quiet', label: 'Quiet' },
  // Emotion
  { tag: 'tremble', label: 'Tremble' },
  { tag: 'fear', label: 'Fear' },
  { tag: 'joy', label: 'Joy' },
  { tag: 'anger', label: 'Anger' },
  { tag: 'sadness', label: 'Sadness' },
  // Timing/Pacing
  { tag: 'fast', label: 'Fast' },
  { tag: 'slow', label: 'Slow' },
  { tag: 'stutter', label: 'Stutter' },
  { tag: 'pause', label: 'Pause' },
  // Mental State/Voice
  { tag: 'thought', label: 'Thought' },
  { tag: 'dream', label: 'Dream' },
  { tag: 'robotic', label: 'Robotic' },
  { tag: 'weak', label: 'Weak' },
  { tag: 'ghostly', label: 'Ghostly' },
  // Stylistic
  { tag: 'emphasis', label: 'Emphasis' },
  { tag: 'fade', label: 'Fade' },
  { tag: 'fadein', label: 'Fade In' },
  { tag: 'fadeout', label: 'Fade Out' },
  { tag: 'echo', label: 'Echo' },
  { tag: 'distant', label: 'Distant' },
  // Special
  { tag: 'hesitate', label: 'Hesitate' },
  { tag: 'impact', label: 'Impact' },
  { tag: 'underwater', label: 'Underwater' },
  { tag: 'radio', label: 'Radio' },
];

interface TextEffectsToolbarProps {
  editorRef: RefObject<HTMLTextAreaElement | null>;
  setContent: (value: string | ((prev: string) => string)) => void;
  disabled?: boolean;
}

export default function TextEffectsToolbar({ editorRef, setContent, disabled = false }: TextEffectsToolbarProps) {

  // applyTag function remains the same
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
    const tagEnd = `[${tag}]`; // Assuming same tag for start/end

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
    <div className="flex flex-wrap gap-1 p-2 border rounded-md bg-muted">
      {EFFECT_BUTTONS.map(({ tag, label }) => (
        <Button
          key={tag}
          variant="ghost" // Keep ghost variant for base button styling
          size="sm"
          onClick={() => applyTag(tag)}
          title={`Apply ${label} effect`}
          disabled={disabled}
          // Apply base button styles + potentially remove conflicting text styles
          className={cn(
            "px-2 py-1 h-auto text-xs font-medium", // Base size/padding/font
            "hover:bg-background", // Use background for hover on ghost
            // Remove base text color to allow effect class to take over
            // "text-muted-foreground hover:text-foreground"
             "disabled:opacity-50" // Ensure disabled style works
          )}
          aria-label={`Apply ${label} effect`}
        >
          {/* --- MODIFICATION START: Wrap label in span with effect class --- */}
          {/* Construct the CSS class name dynamically */}
          <span className={cn(`effect-${tag}`)}>
             {label}
          </span>
          {/* --- MODIFICATION END --- */}
        </Button>
      ))}
    </div>
  );
}