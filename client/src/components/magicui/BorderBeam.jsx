/**
 * Magic UI – BorderBeam
 * A rotating beam of light that travels along the border of its container.
 */
import React from 'react';

export function BorderBeam({
  size = 200,
  duration = 5,
  anchor = 90,
  borderWidth = 2,
  colorFrom = '#7d6dff',
  colorTo = '#b387ff',
  delay = 0,
  className = '',
  style = {},
}) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 rounded-[inherit] ${className}`}
      style={{
        ...style,
        '--border-beam-size': `${size}px`,
        '--border-beam-duration': `${duration}s`,
        '--border-beam-anchor': `${anchor}%`,
        '--border-beam-color-from': colorFrom,
        '--border-beam-color-to': colorTo,
        '--border-beam-delay': `${-delay}s`,
        '--border-beam-width': `${borderWidth}px`,
      }}
    >
      <style>{`
        @property --border-beam-angle {
          syntax: '<angle>';
          inherits: false;
          initial-value: 0deg;
        }
        .border-beam-inner {
          position: absolute;
          inset: calc(-1 * var(--border-beam-width));
          border-radius: inherit;
          padding: var(--border-beam-width);
          background: conic-gradient(
            from calc(var(--border-beam-anchor) * 1deg) at 50% 50%,
            transparent 70%,
            var(--border-beam-color-from),
            var(--border-beam-color-to),
            transparent
          );
          -webkit-mask:
            linear-gradient(#000 0 0) content-box,
            linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          animation: border-beam-spin var(--border-beam-duration) linear var(--border-beam-delay) infinite;
        }
        @keyframes border-beam-spin {
          to { --border-beam-anchor: 450; }
        }
      `}</style>
      <div className="border-beam-inner" />
    </div>
  );
}

