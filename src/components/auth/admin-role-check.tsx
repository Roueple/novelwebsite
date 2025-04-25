"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { UserRole } from '@/types/supabase'; // Import UserRole

interface AdminRoleCheckProps {
  children: React.ReactNode;
  // allowAuthor prop now means "allow users with 'admin' role" based on the simplified logic
  allowAuthor?: boolean;
}

/**
 * Component to check if the current user has admin role.
 * If not, redirects to home page.
 * The allowAuthor prop is kept for compatibility but effectively means requiring 'admin' role.
 */
export const AdminRoleCheck: React.FC<AdminRoleCheckProps> = ({
  children,
  allowAuthor = false // Default to false, meaning strict admin check
}) => {
  // Destructure user, role, loading from useAuth
  const router = useRouter();
  const { user, role, loading } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // Only check authorization once auth loading is complete and role is available
    if (!loading && role !== null) {
      if (!user) {
        // No user, redirect to home page
        router.push('/');
      } else {
        // Check role: only 'admin' is authorized for these protected routes
        const hasAccess = role === 'admin';

        if (!hasAccess) {
          console.warn(`Access denied for user ${user.id} (Role: ${role}) to protected route. Redirecting.`);
          router.push('/');
        } else {
          console.log(`Access granted for user ${user.id} (Role: ${role}).`);
          setIsAuthorized(true);
        }
      }
    }
  }, [user, role, loading, router, allowAuthor]); // Keep allowAuthor in dependency array even if logic simplified

  // Show loading spinner while checking authorization
  // Also show loading if role is still null (meaning auth is still loading or profile isn't fetched)
  if (loading || role === null || !isAuthorized) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // User is authorized, render children
  return <>{children}</>;
};

export default AdminRoleCheck;
