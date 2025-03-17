"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import LoadingSpinner from '@/components/ui/loading-spinner';

interface AdminRoleCheckProps {
  children: React.ReactNode;
  allowAuthor?: boolean; // If true, also allow authors access
}

/**
 * Component to check if the current user has admin (or optionally author) role
 * If not, redirects to home page
 */
export const AdminRoleCheck: React.FC<AdminRoleCheckProps> = ({ 
  children, 
  allowAuthor = false 
}) => {
  const router = useRouter();
  const { user, role, loading } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // Only check authorization once auth loading is complete
    if (!loading) {
      if (!user) {
        // No user, redirect to home page
        router.push('/');
      } else {
        // Check roles
        const hasAccess = role === 'admin' || (allowAuthor && role === 'author');
        
        if (!hasAccess) {
          router.push('/');
        } else {
          setIsAuthorized(true);
        }
      }
    }
  }, [user, role, loading, router, allowAuthor]);

  // Show loading spinner while checking authorization
  if (loading || !isAuthorized) {
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