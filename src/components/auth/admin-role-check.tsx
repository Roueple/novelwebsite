// src/components/auth/admin-role-check.tsx
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import LoadingSpinner from '@/components/ui/loading-spinner';

interface AdminRoleCheckProps {
  children: React.ReactNode;
}

export const AdminRoleCheck: React.FC<AdminRoleCheckProps> = ({ children }) => {
  const router = useRouter();
  const { user, role, loading } = useAuth();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/');
      } else if (role !== 'admin') {
        router.push('/');
      } else {
        setIsChecking(false);
      }
    }
  }, [user, role, loading, router]);

  if (isChecking || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center space-y-4">
          <LoadingSpinner className="h-8 w-8" />
          <p className="text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};