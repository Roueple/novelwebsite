// src/components/ui/loading-spinner.tsx
import React from 'react';
import { cn } from '@/lib/utils';
import { RefreshCw } from 'lucide-react';

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  // Include at least one property to make it not empty
  size?: 'sm' | 'md' | 'lg';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  className, 
  size = 'md',
  ...props 
}) => {
  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-6 w-6'
  };
  
  return (
    <div className={cn("animate-spin", sizeClasses[size], className)} {...props}>
      <RefreshCw className="h-full w-full" />
    </div>
  );
};

export default LoadingSpinner;