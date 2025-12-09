import type { ReactNode } from 'react';

interface SkeletonProps {
  className?: string;
  children?: ReactNode;
}

export function Skeleton({ className = '', children }: SkeletonProps) {
  return (
    <div className={`animate-pulse rounded-md bg-slate-200/60 ${className}`}>
      {children}
    </div>
  );
}
