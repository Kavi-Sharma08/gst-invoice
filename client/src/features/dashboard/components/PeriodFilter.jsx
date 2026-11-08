import React from 'react';

/**
 * Segmented control button group for period selection.
 */
export function PeriodFilter({ options = [], value, onChange }) {
  return (
    <div className="inline-flex items-center p-1 rounded-lg border border-border bg-surface text-xs overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      {options.map((p) => {
        const active = value === p;
        return (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              active
                ? 'bg-border/60 text-text font-semibold shadow-xs'
                : 'text-muted hover:text-text'
            }`}
          >
            {p}
          </button>
        );
      })}
    </div>
  );
}

export default PeriodFilter;

