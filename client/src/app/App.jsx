import React, { Suspense } from 'react';
import { AppRoutes } from './AppRoutes';
import { LoadingFallback } from '@/components/ui/LoadingFallback';
import '@/styles/dashboard.css';

export function App() {
  return (
    <Suspense fallback={<LoadingFallback message="Loading..." />}>
      <AppRoutes />
    </Suspense>
  );
}

export default App;
