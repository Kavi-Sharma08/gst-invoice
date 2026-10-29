import React, { useRef } from 'react';

/**
 * RippleButton matching Magic UI / reference build spec.
 * On click, triggers a smooth radial ripple animation expanding from the cursor point.
 */
export function RippleButton({
  children,
  onClick,
  className = '',
  variant = 'default', // 'default' | 'pri' | 'sm'
  disabled = false,
  type = 'button',
  ...props
}) {
  const buttonRef = useRef(null);

  const handleClick = (e) => {
    if (disabled) return;

    // Check prefers-reduced-motion
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!prefersReducedMotion && buttonRef.current) {
      const button = buttonRef.current;
      const rect = button.getBoundingClientRect();
      const diameter = Math.max(rect.width, rect.height) * 2;
      const x = e.clientX ? e.clientX - rect.left : rect.width / 2;
      const y = e.clientY ? e.clientY - rect.top : rect.height / 2;

      const ripple = document.createElement('span');
      ripple.className = 'ripple';
      ripple.style.width = `${diameter}px`;
      ripple.style.height = `${diameter}px`;
      ripple.style.left = `${x - diameter / 2}px`;
      ripple.style.top = `${y - diameter / 2}px`;

      button.appendChild(ripple);
      setTimeout(() => {
        ripple.remove();
      }, 700);
    }

    if (onClick) {
      onClick(e);
    }
  };

  let variantClass = '';
  if (variant === 'pri' || variant === 'primary') {
    variantClass = ' pri';
  } else if (variant === 'sm' || variant === 'small') {
    variantClass = ' sm';
  }

  return (
    <button
      ref={buttonRef}
      type={type}
      className={`btn${variantClass}${className ? ` ${className}` : ''}`}
      onClick={handleClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

export default RippleButton;

