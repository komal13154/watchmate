import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}

const base =
  'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap';

const variants: Record<string, string> = {
  primary:
    'text-black bg-[image:var(--wm-gradient)] hover:brightness-110 active:brightness-95 shadow-[0_8px_20px_-8px_rgba(255,106,69,0.5)]',
  secondary:
    'text-[var(--wm-text)] bg-[var(--wm-bg-elevated)] border border-[var(--wm-border)] hover:border-[var(--wm-text-faint)]',
  ghost: 'text-[var(--wm-text-muted)] hover:text-[var(--wm-text)] hover:bg-[var(--wm-bg-elevated)]',
  danger: 'text-white bg-[var(--wm-danger)] hover:brightness-110',
};

const sizes: Record<string, string> = {
  sm: 'text-sm px-3 py-1.5',
  md: 'text-sm px-4 py-2.5',
  lg: 'text-base px-6 py-3.5',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  className = '',
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <span
          className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin"
          aria-hidden="true"
        />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}
