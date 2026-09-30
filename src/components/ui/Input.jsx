import React from 'react';

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
        <label htmlFor={inputId} className="block text-xs font-semibold text-slate-700 mb-1.5">
          {label}
          {required && <span className="text-rose-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-3 text-xs font-medium text-slate-500 select-none pointer-events-none">
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
          className={`w-full text-sm rounded-md border bg-white px-3 py-2 text-slate-900 transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
            prefix ? 'pl-7' : ''
          } ${suffix ? 'pr-8' : ''} ${
            error
              ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500'
              : 'border-slate-300 hover:border-slate-400 focus:border-slate-800 focus:ring-slate-800'
          } ${disabled ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
          {...props}
        />
        {suffix && (
          <span className="absolute right-3 text-xs font-medium text-slate-500 select-none pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
      {!error && helperText && <p className="mt-1 text-xs text-slate-500">{helperText}</p>}
    </div>
  );
}
