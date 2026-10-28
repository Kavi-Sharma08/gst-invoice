import React from 'react';

/**
 * Glide-inspired Pill Button Component
 */
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
  const base = 'inline-flex items-center justify-center font-medium rounded-full transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none cursor-pointer active:scale-[0.98] select-none';

  const variants = {
    primary: 'bg-[#0B0C0E] text-white hover:bg-[#202328] active:bg-[#000000] border border-black/10 shadow-xs',
    secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200/80 border border-slate-200/60',
    outline: 'bg-white text-slate-800 hover:bg-slate-50/90 border border-slate-200/90 shadow-2xs hover:border-slate-300',
    ghost: 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/80',
    danger: 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/80 active:bg-rose-200'
  };

  const sizes = {
    xs: 'text-[11px] px-2.5 py-1 gap-1',
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-xs sm:text-sm px-4 py-2 gap-2 font-medium',
    lg: 'text-sm sm:text-base px-5 py-2.5 gap-2.5 font-semibold'
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

export default Button;
