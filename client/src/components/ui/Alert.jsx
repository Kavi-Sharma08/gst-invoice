import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

export function Alert({ variant = 'info', title, children, className = '' }) {
  const configs = {
    info: {
      bg: 'bg-sky-500/10 border-sky-500/30 text-sky-200',
      icon: <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
    },
    success: {
      bg: 'bg-emerald-500/10 border-emerald-500/30 text-[var(--success)]',
      icon: <CheckCircle2 className="w-4 h-4 text-[var(--success)] shrink-0 mt-0.5" />
    },
    warning: {
      bg: 'bg-amber-500/10 border-amber-500/30 text-[var(--warning)]',
      icon: <AlertTriangle className="w-4 h-4 text-[var(--warning)] shrink-0 mt-0.5" />
    },
    error: {
      bg: 'bg-rose-500/10 border-rose-500/30 text-[var(--danger)]',
      icon: <AlertCircle className="w-4 h-4 text-[var(--danger)] shrink-0 mt-0.5" />
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

export default Alert;
