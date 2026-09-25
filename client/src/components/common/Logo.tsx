interface LogoProps {
  size?: number;
  showWordmark?: boolean;
  className?: string;
}

export default function Logo({ size = 28, showWordmark = true, className = '' }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <circle cx="20" cy="20" r="18" fill="var(--wm-bg-card)" stroke="var(--wm-border)" />
        {/* three connected "people" nodes orbiting the play button */}
        <circle cx="8" cy="12" r="2.4" fill="var(--wm-presence)" />
        <circle cx="32" cy="12" r="2.4" fill="var(--wm-accent-2)" />
        <circle cx="20" cy="33" r="2.4" fill="var(--wm-accent)" />
        <path
          d="M8 12 L20 20 L32 12 M20 20 L20 33"
          stroke="var(--wm-border)"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <path d="M16 13.5 L27 20 L16 26.5 Z" fill="url(#wm-logo-grad)" />
        <defs>
          <linearGradient id="wm-logo-grad" x1="16" y1="13" x2="27" y2="26" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ff6a45" />
            <stop offset="1" stopColor="#ffb648" />
          </linearGradient>
        </defs>
      </svg>
      {showWordmark && (
        <span className="font-display font-bold text-lg tracking-tight text-[var(--wm-text)]">
          WatchMate
        </span>
      )}
    </div>
  );
}
