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
        <label htmlFor={textareaId} className="block text-xs font-semibold text-slate-700 mb-1.5 tracking-tight">
          {label}
          {required && <span className="text-rose-500 ml-1 font-bold">*</span>}
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
        className={`w-full text-xs sm:text-sm rounded-xl border bg-white px-3.5 py-2.5 text-slate-900 transition-all placeholder:text-slate-400 focus:outline-none resize-y ${
          error
            ? 'border-rose-300 focus:border-rose-500 focus:ring-3 focus:ring-rose-500/10'
            : 'border-slate-200/90 hover:border-slate-300 focus:border-slate-900 focus:ring-3 focus:ring-slate-900/5'
        } ${disabled ? 'bg-slate-50/80 text-slate-400 cursor-not-allowed' : 'shadow-2xs'}`}
        {...props}
      />
      {error && <p className="mt-1 text-[11px] font-medium text-rose-600">{error}</p>}
      {!error && helperText && <p className="mt-1 text-[11px] text-slate-400">{helperText}</p>}
    </div>
  );
}

export default Textarea;
