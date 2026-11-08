import React from 'react';

/**
 * Generic KPI card component.
 */
export function KpiCard({ label, icon: Icon, value, footer, footerTitle }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 flex flex-col justify-between space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-muted">{label}</span>
        {Icon && <Icon className="w-4 h-4 text-muted" />}
      </div>
      <div>
        <div className="text-[20px] font-semibold text-text tabular-nums tracking-tight">
          {value}
        </div>
        <div className="text-[12px] text-muted min-h-[18px] mt-0.5 truncate" title={footerTitle}>
          {footer}
        </div>
      </div>
    </div>
  );
}

export default KpiCard;

