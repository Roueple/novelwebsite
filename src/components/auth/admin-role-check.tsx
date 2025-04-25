"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import LoadingSpinner from '@/components/ui/loading-spinner';

interface AdminRoleCheckProps {
  children: React.ReactNode;
  allowAuthor?: boolean; // If true, also allow users with is_creator: true access
}

/**
 * Component to check if the current user has admin role or (optionally) is_creator: true
 * If not, redirects to home page
 */
export const AdminRoleCheck: React.FC<AdminRoleCheckProps> = ({
  children,
  allowAuthor = false
}) => {
  // Destructure isCreator from useAuth
  const router = useRouter();
  const { user, role, isCreator, loading } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // Only check authorization once auth loading is complete and isCreator status is available
    if (!loading && isCreator !== null) {
      if (!user) {
        // No user, redirect to home page
        router.push('/');
      } else {
        // Check roles and creator status
        // User has access if they are an admin OR (allowAuthor is true AND they are a creator)
        const hasAccess = role === 'admin' || (allowAuthor && isCreator);

        if (!hasAccess) {
          console.warn(`Access denied for user ${user.id} (Role: ${role}, Is Creator: ${isCreator}) to protected route. Redirecting.`);
          router.push('/');
        } else {
          console.log(`Access granted for user ${user.id} (Role: ${role}, Is Creator: ${isCreator}).`);
          setIsAuthorized(true);
        }
      }
    }
  }, [user, role, isCreator, loading, router, allowAuthor]); // Added isCreator as a dependency

  // Show loading spinner while checking authorization
  // Also show loading if isCreator status is still null (meaning auth is still loading or profile isn't fetched)
  if (loading || isCreator === null || !isAuthorized) {
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
