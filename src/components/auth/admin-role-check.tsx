// src/components/auth/admin-role-check.tsx
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
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/');
      } else {
        // Check if user has appropriate role
        const hasAccess = role === 'admin' || (allowAuthor && role === 'author');
        
        if (!hasAccess) {
          router.push('/');
        } else {
          setIsChecking(false);
        }
      }
    }
  }, [user, role, loading, router, allowAuthor]);

  if (isChecking || loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminRoleCheck;