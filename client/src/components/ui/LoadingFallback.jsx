import React from 'react';

/**
 * Modern loading fallback for React.Suspense during route transitions.
 */
export function LoadingFallback({ message = 'Loading page...' }) {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center py-12 px-4 animate-fade-in">
      <div className="relative flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-slate-200 border-t-slate-900 animate-spin" />
        <div className="absolute font-bold text-xs text-slate-800">₹</div>
      </div>
      <p className="mt-4 text-xs font-medium text-slate-500 tracking-wide">{message}</p>
    </div>
  );
}

export default LoadingFallback;
