export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-[var(--wm-text-muted)]">
      <span className="h-6 w-6 rounded-full border-2 border-[var(--wm-border)] border-t-[var(--wm-accent)] animate-spin" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center px-6">
      <div className="h-11 w-11 rounded-full bg-[rgba(255,59,92,0.12)] flex items-center justify-center text-[var(--wm-danger)] text-xl">
        !
      </div>
      <h3 className="font-display font-semibold text-[var(--wm-text)]">{title}</h3>
      <p className="text-sm text-[var(--wm-text-muted)] max-w-sm">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 text-sm font-medium text-[var(--wm-accent)] hover:underline"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center px-6 border border-dashed border-[var(--wm-border)] rounded-2xl">
      <h3 className="font-display font-semibold text-[var(--wm-text)]">{title}</h3>
      <p className="text-sm text-[var(--wm-text-muted)] max-w-sm">{message}</p>
      {action}
    </div>
  );
}
