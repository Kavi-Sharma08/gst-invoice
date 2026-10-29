import React from 'react';

/**
 * Glide-styled Input Component
 */
export function Input({
  label,
  id,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  helperText,
  required = false,
  disabled = false,
  className = '',
  prefix,
  suffix,
  ...props
}) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-[var(--foreground)] mb-1.5 tracking-tight">
          {label}
          {required && <span className="text-[var(--danger)] ml-1 font-semibold">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-3.5 text-xs font-medium text-[var(--muted)] select-none pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          id={inputId}
          type={type}
          value={value ?? ''}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`w-full text-xs sm:text-sm rounded-xl border bg-[var(--surface)] px-3.5 py-2.5 text-[var(--foreground)] transition-all placeholder:text-[var(--muted)] focus:outline-none ${
            prefix ? 'pl-8' : ''
          } ${suffix ? 'pr-9' : ''} ${
            error
              ? 'border-[var(--danger)] focus:border-[var(--danger)] focus:ring-2 focus:ring-[var(--danger)]/20'
              : 'border-[var(--border)] hover:border-[var(--ring-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20'
          } ${disabled ? 'opacity-50 text-[var(--muted)] cursor-not-allowed' : ''}`}
          {...props}
        />
        {suffix && (
          <span className="absolute right-3.5 text-xs font-medium text-[var(--muted)] select-none pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {error && <p className="mt-1 text-[11px] font-medium text-[var(--danger)]">{error}</p>}
      {!error && helperText && <p className="mt-1 text-[11px] text-[var(--muted)]">{helperText}</p>}
    </div>
  );
}

export default Input;
