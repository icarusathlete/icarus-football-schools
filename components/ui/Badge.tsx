import React from 'react';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'brand' | 'lime';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  variant?: BadgeVariant;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral', className = '', ...props }) => {
  const baseStyles = "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] italic";
  
  const variants = {
    success: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    warning: "bg-orange-500/10 text-orange-400 border border-orange-500/20",
    danger: "bg-red-500/10 text-red-500 border border-red-500/20",
    info: "bg-brand-500/10 text-brand-500 border border-brand-500/20",
    neutral: "bg-brand-800 text-brand-400 border border-white/5",
    brand: "bg-brand-500/10 text-brand-500 border border-brand-500/30 shadow-[0_0_10px_rgba(14,165,233,0.1)]",
    lime: "bg-lime/10 text-lime border border-lime/30 shadow-[0_0_10px_rgba(190,242,100,0.1)]"
  };

  return (
    <span className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
      {children}
    </span>
  );
};
