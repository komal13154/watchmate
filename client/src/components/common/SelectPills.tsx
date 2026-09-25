interface SelectPillsProps<T extends string> {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
}

export default function SelectPills<T extends string>({
  label,
  options,
  value,
  onChange,
}: SelectPillsProps<T>) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-[var(--wm-text)]">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = option === value;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              aria-pressed={active}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium border transition-colors ${
                active
                  ? 'bg-[var(--wm-accent-soft)] border-[var(--wm-accent-border)] text-[var(--wm-accent)]'
                  : 'bg-[var(--wm-bg-elevated)] border-[var(--wm-border)] text-[var(--wm-text-muted)] hover:text-[var(--wm-text)]'
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
