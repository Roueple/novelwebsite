// src/hooks/use-chapter-actions.ts
// This hook now simply determines if the user has the 'admin' role.

import { useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { UserRole } from '@/types/supabase';

export function useChapterActions(
  user: User | null,
  role: UserRole | null
  // Removed 'novel' parameter as it's no longer needed for the admin-only check
) {
  // Determine if the user is an admin.
  // Access to editing is now solely based on the 'admin' role.
  const isAuthor = useMemo(() => {
     // User is considered 'authorized' for editing if their role is 'admin'
     return user !== null && role === 'admin';
  }, [user, role]); // Depend on user and role

  return {
    isAuthor, // Expose the 'admin' status
  };
}
