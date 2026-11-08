import React from 'react';
import { PageHeader } from '@/components/layout/PageHeader';

/**
 * Loading skeleton matching the full Dashboard layout.
 */
export function DashboardSkeleton() {
  return (
    <div className="w-full bg-bg text-text font-sans flex flex-col min-h-full">
      <div className="mx-auto max-w-screen-xl w-full px-4 sm:px-6 py-6 space-y-4">
        <PageHeader title="Dashboard" srOnlyTitle />

        {/* Action bar skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="h-10 w-72 bg-border/60 rounded-lg animate-pulse" />
          <div className="h-10 w-32 bg-border/60 rounded-lg animate-pulse ml-auto" />
        </div>

        {/* 4 Stat Cards skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-surface p-4 space-y-3 animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div className="h-3 w-16 bg-border/60 rounded" />
                <div className="h-4 w-4 bg-border/60 rounded" />
              </div>
              <div className="h-5 w-24 bg-border/60 rounded" />
              <div className="h-3 w-28 bg-border/60 rounded" />
            </div>
          ))}
        </div>

        {/* 5 Skeleton rows */}
        <div className="rounded-xl border border-border bg-surface p-4 divide-y divide-border">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="py-3.5 flex items-center justify-between gap-4 animate-pulse"
            >
              <div className="space-y-1.5 min-w-0">
                <div className="h-4 w-36 bg-border/60 rounded" />
                <div className="h-3 w-52 bg-border/60 rounded" />
              </div>
              <div className="h-4 w-20 bg-border/60 rounded shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default DashboardSkeleton;

