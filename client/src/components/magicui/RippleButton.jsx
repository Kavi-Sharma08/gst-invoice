/**
 * Magic UI – RippleButton
 * Standard button with click-ripple from point of contact.
 */
import React, { useRef } from 'react';
import { addRipple } from './ripple';

export function RippleButton({
  children,
  className = '',
  onClick,
  href,
  variant = 'outline', // 'outline' | 'ghost'
  size = 'md',
  ...props
}) {
  const ref = useRef(null);

  const handleClick = (e) => {
    addRipple(e, ref.current);
    onClick?.(e);
  };

  const Tag = href ? 'a' : 'button';

  return (
    <Tag
      ref={ref}
      href={href}
      className={`ripple-btn relative overflow-hidden inline-flex items-center gap-2 rounded-full font-bold cursor-pointer transition-transform duration-200 hover:-translate-y-0.5 ${className}`}
      onClick={handleClick}
      {...props}
    >
      <style>{`
        .ripple-btn .ripple-effect {
          position: absolute;
          border-radius: 50%;
          opacity: 0.3;
          transform: scale(0);
          animation: ripple-out 0.65s ease-out forwards;
          pointer-events: none;
        }
        @keyframes ripple-out {
          to { transform: scale(1); opacity: 0; }
        }
      `}</style>
      {children}
    </Tag>
  );
}

