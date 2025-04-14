// src/components/editor/text-effects-toolbar.tsx
import React, { RefObject } from 'react';
import { Button } from '@/components/ui/button';
import { Bold, Italic, Strikethrough, Code, Type, Quote, Heading2, List, ListOrdered } from 'lucide-react';

const EFFECT_BUTTONS = [
  // ... (keep your effect buttons array)
  { tag: 'shout', label: 'Shout', icon: '📣' },
  { tag: 'whisper', label: 'Whisper', icon: '🤫' },
  { tag: 'tremble', label: 'Tremble', icon: '🥶' },
  { tag: 'fear', label: 'Fear', icon: '😨' },
  { tag: 'joy', label: 'Joy', icon: '😊' },
  { tag: 'anger', label: 'Anger', icon: '😠' },
  { tag: 'thought', label: 'Thought', icon: '🤔' },
  { tag: 'emphasis', label: 'Emphasis', icon: <Bold size={16}/> },
  { tag: 'impact', label: 'Impact', icon: '💥' },
  { tag: 'pause', label: 'Pause', icon: '…' },
];

// --- CORRECTED INTERFACE - Allow null in the generic type ---
interface TextEffectsToolbarProps {
  // Explicitly state that the element the ref points to might be null initially
  editorRef: RefObject<HTMLTextAreaElement | null>;
  setContent: (value: string | ((prev: string) => string)) => void;
  disabled?: boolean;
}
// --- END CORRECTION ---

export default function TextEffectsToolbar({ editorRef, setContent, disabled = false }: TextEffectsToolbarProps) {

  const applyTag = (tag: string) => {
    const textarea = editorRef.current; // Still HTMLTextAreaElement | null
    if (!textarea) {
        console.warn("Textarea ref not available yet.");
        return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const tagStart = `[${tag}]`;
    const tagEnd = `[${tag}]`;

    const newText = selectedText
      ? `${tagStart}${selectedText}${tagEnd}`
      : `${tagStart}${tagEnd}`;

    const before = textarea.value.substring(0, start);
    const after = textarea.value.substring(end);

    setContent(currentContent => before + newText + after);

    setTimeout(() => {
      // Null check remains important before accessing methods/properties
      if (editorRef.current) {
          editorRef.current.focus();
          if (selectedText) {
            editorRef.current.setSelectionRange(start, start + newText.length);
          } else {
            editorRef.current.setSelectionRange(start + tagStart.length, start + tagStart.length);
          }
      }
    }, 0);
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
        >
          {typeof icon === 'string' ? <span className="text-base">{icon}</span> : icon}
        </Button>
      ))}
    </div>
  );
}