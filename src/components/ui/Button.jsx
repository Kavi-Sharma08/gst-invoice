import React from 'react';

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  className = '',
  disabled = false,
  onClick,
  ...props
}) {
  const base = 'inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none rounded-md cursor-pointer';

  const variants = {
    primary: 'bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-950 border border-transparent shadow-xs',
    secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200 active:bg-slate-300 border border-slate-200',
    outline: 'bg-white text-slate-800 hover:bg-slate-50 border border-slate-300 shadow-2xs',
    ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 active:bg-slate-200',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800'
  };

  const sizes = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-sm px-3.5 py-2 gap-2',
    lg: 'text-base px-4 py-2.5 gap-2.5'
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${base} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
