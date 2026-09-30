import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

export function Alert({ variant = 'info', title, children, className = '' }) {
  const configs = {
    info: {
      bg: 'bg-blue-50 border-blue-200 text-blue-900',
      icon: <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
    },
    success: {
      bg: 'bg-emerald-50 border-emerald-200 text-emerald-900',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
    },
    warning: {
      bg: 'bg-amber-50 border-amber-200 text-amber-900',
      icon: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
    },
    error: {
      bg: 'bg-rose-50 border-rose-200 text-rose-900',
      icon: <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
    }
  };

  const config = configs[variant] || configs.info;

  return (
    <div className={`flex items-start gap-2.5 p-3 rounded-lg border text-xs leading-relaxed ${config.bg} ${className}`}>
      {config.icon}
      <div className="flex-1">
        {title && <p className="font-semibold mb-0.5">{title}</p>}
        <div>{children}</div>
      </div>
    </div>
  );
}
