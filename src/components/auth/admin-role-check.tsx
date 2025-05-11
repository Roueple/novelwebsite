// src/components/auth/admin-role-check.tsx
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { UserRole } from '@/types/supabase'; // Ensure UserRole is 'admin' | 'reader'

interface AdminRoleCheckProps {
  children: React.ReactNode;
  // If allowAuthor is true, it means this component is used in a context
  // where an author (who IS an admin in your simplified model) can access.
  // If false, it's a stricter admin-only check, but functionally they are the same
  // if author privileges are a subset of admin privileges and both require 'admin' role.
  // For simplicity, we'll assume any access through this component requires 'admin' role.
  allowAuthor?: boolean;
}

export const AdminRoleCheck: React.FC<AdminRoleCheckProps> = ({ children, allowAuthor = false }) => {
  const router = useRouter();
  const { user, role, loading, profileLoading, ensureProfileLoaded } = useAuth();
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);

  useEffect(() => {
    const checkAuthAndRole = async () => {
      if (loading) {
        setIsCheckingProfile(true);
        return;
      }

      if (!user) {
        console.log("[AdminRoleCheck] No user session, redirecting to home.");
        router.push('/');
        setIsCheckingProfile(false);
        return;
      }

      if (role === null && !profileLoading) { // Check !profileLoading here
        setIsCheckingProfile(true);
        console.log("[AdminRoleCheck] Role not loaded, calling ensureProfileLoaded.");
        await ensureProfileLoaded();
        // State will update, and this useEffect will re-run.
        // profileLoading will be true during the fetch, then false.
        // Then role should be populated or still null if fetch failed.
        // No need to set isCheckingProfile here, rely on profileLoading for next render.
        return;
      }

      // If still loading profile after ensureProfileLoaded was called, wait.
      if (profileLoading) {
        setIsCheckingProfile(true);
        return;
      }

      // Profile loading is done, role should be populated or definitively null (if fetch failed)
      setIsCheckingProfile(false);

      // The core access check: user must be an admin.
      // The allowAuthor prop doesn't change this requirement if authors ARE admins.
      // If 'author' was a distinct, less-privileged role, the logic would be different.
      if (role !== 'admin') {
        console.warn(`[AdminRoleCheck] Access denied for user ${user.id} (Role: ${role}). Expected 'admin'. Redirecting.`);
        router.push('/');
      }
    };

    checkAuthAndRole();
  }, [user, role, loading, profileLoading, router, ensureProfileLoaded]); // allowAuthor removed as it doesn't change the core 'admin' requirement here

  // Show loading spinner
  if (loading || isCheckingProfile || profileLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // If all checks passed and user is admin (useEffect handles redirection if not)
  if (user && role === 'admin') {
    return <>{children}</>;
  }

  // Fallback loading/message state (should ideally be covered by redirection in useEffect)
  // This will show if, for some reason, redirection hasn't happened yet but user is not admin.
  return (
    <div className="flex items-center justify-center h-screen bg-background">
       <LoadingSpinner size="lg" />
       <p className="text-muted-foreground">Verifying access...</p>
    </div>
  );
};

export default AdminRoleCheck;