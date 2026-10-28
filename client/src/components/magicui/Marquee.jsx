/**
 * Magic UI – Marquee
 * Infinite scrolling strip, pauses on hover, faded edges.
 */
import React from 'react';

export function Marquee({
  children,
  pauseOnHover = true,
  direction = 'left',
  speed = 32,
  className = '',
}) {
  const isPaused = pauseOnHover ? 'group-hover:[animation-play-state:paused]' : '';
  const dir = direction === 'right' ? 'reverse' : 'normal';

  return (
    <div
      className={`group relative overflow-hidden [--duration:${speed}s] ${className}`}
      style={{
        maskImage: 'linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)',
        WebkitMaskImage: 'linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)',
      }}
    >
      <div
        className={`flex min-w-full gap-3.5 pr-3.5 w-max animate-marquee ${isPaused}`}
        style={{
          '--marquee-direction': dir,
          animation: `marquee ${speed}s linear infinite`,
          animationDirection: dir,
        }}
      >
        {children}
        {/* Duplicate for seamless loop */}
        {children}
        {children}
        {children}
      </div>
      <style>{`
        @keyframes marquee {
          to { transform: translateX(-25%); }
        }
      `}</style>
    </div>
  );
}

