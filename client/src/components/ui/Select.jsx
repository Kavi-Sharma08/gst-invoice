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
        <label htmlFor={selectId} className="block text-xs font-semibold text-[var(--foreground)] mb-1.5 tracking-tight">
          {label}
          {required && <span className="text-[var(--danger)] ml-1 font-semibold">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          value={value ?? ''}
          onChange={onChange}
          disabled={disabled}
          required={required}
          className={`w-full appearance-none text-xs sm:text-sm rounded-xl border bg-[var(--surface)] px-3.5 py-2.5 pr-9 text-[var(--foreground)] transition-all focus:outline-none ${
            error
              ? 'border-[var(--danger)] focus:border-[var(--danger)] focus:ring-2 focus:ring-[var(--danger)]/20'
              : 'border-[var(--border)] hover:border-[var(--ring-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20'
          } ${disabled ? 'opacity-50 text-[var(--muted)] cursor-not-allowed' : 'cursor-pointer'}`}
          {...props}
        >
          {placeholder && <option value="" className="bg-[#111113] text-[#A1A1AA]">{placeholder}</option>}
          {options.map((opt) => {
            const optVal = typeof opt === 'object' ? opt.value : opt;
            const optLabel = typeof opt === 'object' ? opt.label : opt;
            return (
              <option key={optVal} value={optVal} className="bg-[#111113] text-[#FAFAFA]">
                {optLabel}
              </option>
            );
          })}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[var(--muted)]">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
      {error && <p className="mt-1 text-[11px] font-medium text-[var(--danger)]">{error}</p>}
      {!error && helperText && <p className="mt-1 text-[11px] text-[var(--muted)]">{helperText}</p>}
    </div>
  );
}

export default Select;
