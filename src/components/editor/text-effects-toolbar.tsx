// src/components/editor/text-effects-toolbar.tsx
import React, { RefObject } from 'react'; // Ensure RefObject is imported
import { Button } from '@/components/ui/button';
import { Bold, Italic, Strikethrough, Code, Type, Quote, Heading2, List, ListOrdered } from 'lucide-react'; // Example icons

// Define the effect tags and their corresponding buttons/icons
const EFFECT_BUTTONS = [
  { tag: 'shout', label: 'Shout', icon: '📣' },
  { tag: 'whisper', label: 'Whisper', icon: '🤫' },
  { tag: 'tremble', label: 'Tremble', icon: '🥶' },
  { tag: 'fear', label: 'Fear', icon: '😨' },
  { tag: 'joy', label: 'Joy', icon: '😊' },
  { tag: 'anger', label: 'Anger', icon: '😠' },
  { tag: 'thought', label: 'Thought', icon: '🤔' },
  { tag: 'emphasis', label: 'Emphasis', icon: <Bold size={16}/> }, // Example Lucide icon
  { tag: 'impact', label: 'Impact', icon: '💥' },
  { tag: 'pause', label: 'Pause', icon: '…' },
  // Add more buttons for other effects...
];

// --- >>>> MAKE SURE 'export' IS NOT PRESENT ON THE LINE BELOW <<<< ---
interface TextEffectsToolbarProps {
  editorRef: RefObject<HTMLTextAreaElement>;
  setContent: (value: string | ((prev: string) => string)) => void;
  disabled?: boolean;
}
// --- >>>> END CHECK <<<< ---

export default function TextEffectsToolbar({ editorRef, setContent, disabled = false }: TextEffectsToolbarProps) {

  const applyTag = (tag: string) => {
    const textarea = editorRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const tagStart = `[${tag}]`;
    const tagEnd = `[${tag}]`;

    // Wrap selected text or insert tags at cursor
    const newText = selectedText
      ? `${tagStart}${selectedText}${tagEnd}`
      : `${tagStart}${tagEnd}`;

    const before = textarea.value.substring(0, start);
    const after = textarea.value.substring(end);

    // Update content state using the callback form of setContent
    setContent(currentContent => before + newText + after);

    // Delay focus and selection adjustment to allow React state update
    setTimeout(() => {
      textarea.focus();
      if (selectedText) {
        // Keep the original selection highlighted (now including tags)
        textarea.setSelectionRange(start, start + newText.length);
      } else {
        // Place cursor between the inserted tags
        textarea.setSelectionRange(start + tagStart.length, start + tagStart.length);
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
          {/* Optional: Add label text for larger screens */}
          {/* <span className="hidden sm:inline ml-1 text-xs">{label}</span> */}
        </Button>
      ))}
      {/* Add more standard formatting buttons if needed (Bold, Italic etc. if using Markdown or similar) */}
    </div>
  );
}