// src/components/nprogress-wrapper.tsx
"use client";

import { useNProgress } from '@/hooks/use-nprogress';

// This component's only job is to call the hook.
// It renders nothing itself.
export default function NProgressWrapper() {
  useNProgress();
  return null;
}