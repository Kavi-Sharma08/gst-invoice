/**
 * Magic UI – ShimmerButton
 * A button with a sweeping shimmer animation.
 */
import React, { useRef } from 'react';
import { addRipple } from './ripple';

export function ShimmerButton({
  children,
  className = '',
  shimmerColor = 'rgba(255,255,255,0.3)',
  background = 'var(--accent, #4F46E5)',
  borderRadius = '999px',
  onClick,
  href,
  ...props
}) {
  const ref = useRef(null);

  const handleClick = (e) => {
    addRipple(e, ref.current);
    onClick?.(e);
  };

  const style = {
    background,
    borderRadius,
    position: 'relative',
    overflow: 'hidden',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    border: '1px solid transparent',
    cursor: 'pointer',
    fontWeight: 600,
    transition: 'transform 0.2s',
    '--shimmer-color': shimmerColor,
  };

  const shimmerStyle = {
    content: '""',
    position: 'absolute',
    inset: 0,
    background: `linear-gradient(110deg, transparent 35%, var(--shimmer-color) 50%, transparent 65%)`,
    backgroundSize: '200% 100%',
    animation: 'shimmer-sweep 2.8s infinite',
  };

  const Tag = href ? 'a' : 'button';

  return (
    <Tag
      ref={ref}
      href={href}
      style={style}
      className={`shimmer-btn ${className}`}
      onClick={handleClick}
      {...props}
    >
      <style>{`
        @keyframes shimmer-sweep {
          from { background-position: 200% 0; }
          to   { background-position: -200% 0; }
        }
        .shimmer-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(110deg, transparent 35%, var(--shimmer-color) 50%, transparent 65%);
          background-size: 200% 100%;
          animation: shimmer-sweep 2.8s infinite;
          pointer-events: none;
        }
        .shimmer-btn:hover { transform: translateY(-2px); }
        .ripple-effect {
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

