import React from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Glide-styled Select Component
 */
export function Select({
  label,
  id,
  value,
  onChange,
  options = [],
  placeholder = 'Select an option',
  error,
  helperText,
  required = false,
  disabled = false,
  className = '',
  ...props
}) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={selectId} className="block text-xs font-semibold text-slate-700 mb-1.5 tracking-tight">
          {label}
          {required && <span className="text-rose-500 ml-1 font-bold">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          value={value ?? ''}
          onChange={onChange}
          disabled={disabled}
          required={required}
          className={`w-full appearance-none text-xs sm:text-sm rounded-xl border bg-white px-3.5 py-2.5 pr-9 text-slate-900 transition-all focus:outline-none ${
            error
              ? 'border-rose-300 focus:border-rose-500 focus:ring-3 focus:ring-rose-500/10'
              : 'border-slate-200/90 hover:border-slate-300 focus:border-slate-900 focus:ring-3 focus:ring-slate-900/5'
          } ${disabled ? 'bg-slate-50/80 text-slate-400 cursor-not-allowed' : 'shadow-2xs cursor-pointer'}`}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => {
            const optVal = typeof opt === 'object' ? opt.value : opt;
            const optLabel = typeof opt === 'object' ? opt.label : opt;
            return (
              <option key={optVal} value={optVal}>
                {optLabel}
              </option>
            );
          })}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
      {error && <p className="mt-1 text-[11px] font-medium text-rose-600">{error}</p>}
      {!error && helperText && <p className="mt-1 text-[11px] text-slate-400">{helperText}</p>}
    </div>
  );
}

export default Select;
