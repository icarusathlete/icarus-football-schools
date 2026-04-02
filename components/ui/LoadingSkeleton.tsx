import React from 'react';

interface LoadingSkeletonProps {
  className?: string;
  type?: 'text' | 'circular' | 'rectangular' | 'card';
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ className = '', type = 'text' }) => {
  const baseClasses = "animate-pulse bg-brand-800/80 rounded";
  
  const types = {
    text: "h-4 w-full",
    circular: "rounded-full w-12 h-12",
    rectangular: "h-24 w-full",
    card: "h-48 w-full rounded-xl premium-card"
  };

  return (
    <div className={`${baseClasses} ${types[type]} ${className}`} />
  );
};

export const LoadingList: React.FC<{count?: number}> = ({count = 3}) => {
    return (
        <div className="space-y-4 animate-fade-in w-full">
            {Array.from({length: count}).map((_, i) => (
                <div key={i} className="flex items-center space-x-4 w-full p-4 premium-card">
                    <LoadingSkeleton type="circular" className="flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                        <LoadingSkeleton className="w-1/3" />
                        <LoadingSkeleton className="w-1/2 opacity-50" />
                    </div>
                    <LoadingSkeleton className="w-16 h-8 rounded-full" />
                </div>
            ))}
        </div>
    )
}
