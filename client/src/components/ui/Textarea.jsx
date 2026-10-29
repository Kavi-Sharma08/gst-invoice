import React from 'react';

/**
 * Glide-styled Textarea Component with auto-expand capability
 */
export function Textarea({
  label,
  id,
  value,
  onChange,
  placeholder,
  error,
  helperText,
  required = false,
  disabled = false,
  rows = 3,
  className = '',
  ...props
}) {
  const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={textareaId} className="block text-xs font-semibold text-[var(--foreground)] mb-1.5 tracking-tight">
          {label}
          {required && <span className="text-[var(--danger)] ml-1 font-semibold">*</span>}
        </label>
      )}
      <textarea
        id={textareaId}
        value={value ?? ''}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        rows={rows}
        className={`w-full text-xs sm:text-sm rounded-xl border bg-[var(--surface)] px-3.5 py-2.5 text-[var(--foreground)] transition-all placeholder:text-[var(--muted)] focus:outline-none resize-y ${
          error
            ? 'border-[var(--danger)] focus:border-[var(--danger)] focus:ring-2 focus:ring-[var(--danger)]/20'
            : 'border-[var(--border)] hover:border-[var(--ring-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20'
        } ${disabled ? 'opacity-50 text-[var(--muted)] cursor-not-allowed' : ''}`}
        {...props}
      />
      {error && <p className="mt-1 text-[11px] font-medium text-[var(--danger)]">{error}</p>}
      {!error && helperText && <p className="mt-1 text-[11px] text-[var(--muted)]">{helperText}</p>}
    </div>
  );
}

export default Textarea;
