import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export default function Input({ label, error, hint, id, className = '', ...rest }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-[var(--wm-text)]">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full rounded-lg bg-[var(--wm-bg-elevated)] border px-3.5 py-2.5 text-sm text-[var(--wm-text)] placeholder:text-[var(--wm-text-faint)] outline-none transition-colors ${
          error
            ? 'border-[var(--wm-danger)]'
            : 'border-[var(--wm-border)] focus:border-[var(--wm-accent)]'
        } ${className}`}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        {...rest}
      />
      {error && (
        <p id={`${inputId}-error`} className="text-xs text-[var(--wm-danger)]">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${inputId}-hint`} className="text-xs text-[var(--wm-text-faint)]">
          {hint}
        </p>
      )}
    </div>
  );
}
