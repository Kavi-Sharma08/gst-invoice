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
  const base = 'inline-flex items-center justify-center font-medium rounded-full transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--background)] disabled:opacity-50 disabled:pointer-events-none cursor-pointer active:scale-[0.98] select-none';

  const variants = {
    primary: 'bg-[var(--accent)] text-white hover:opacity-90 active:scale-[0.98] border border-transparent shadow-xs',
    secondary: 'bg-[var(--foreground)] text-[#18181B] hover:opacity-90 border border-transparent font-medium',
    outline: 'bg-transparent text-[var(--foreground)] hover:bg-[var(--surface-hover)] border border-[var(--border)] shadow-2xs',
    ghost: 'bg-transparent text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]',
    danger: 'bg-rose-500/15 text-[var(--danger)] hover:bg-rose-500/25 border border-rose-500/30'
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
