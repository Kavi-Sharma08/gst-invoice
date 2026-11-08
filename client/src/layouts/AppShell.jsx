import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { AceternitySidebar } from '@/components/layout/AceternitySidebar';
import { LoadingFallback } from '@/components/ui/LoadingFallback';

/**
 * Shell that wraps all authenticated workspace routes.
 * Renders the sidebar and mounts child routes via <Outlet /> inside Suspense.
 */
export function AppShell() {
  return (
    <div className="flex flex-col md:flex-row min-h-dvh w-full bg-bg text-text">
      <AceternitySidebar />
      <main className="flex-1 min-w-0 overflow-x-hidden @container">
        <Suspense fallback={<LoadingFallback message="Loading workspace..." />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}

export default AppShell;
