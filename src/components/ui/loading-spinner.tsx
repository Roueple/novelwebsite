// src/components/ui/loading-spinner.tsx
import React from 'react';
import { cn } from '@/lib/utils';
import { RefreshCw } from 'lucide-react';

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ className, ...props }) => {
  return (
    <div className={cn("animate-spin", className)} {...props}>
      <RefreshCw className="h-4 w-4" />
    </div>
  );
};

export default LoadingSpinner;