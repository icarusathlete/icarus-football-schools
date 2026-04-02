import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  glass?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, glass = true, className = '', ...props }) => {
  return (
    <div 
      className={`rounded-xl overflow-hidden ${glass ? 'premium-card' : 'bg-brand-900 border border-white/5'} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
