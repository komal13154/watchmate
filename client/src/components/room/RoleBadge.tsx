import type { Role } from '../../types';

const CONFIG: Record<Role, { label: string; icon: string; className: string }> = {
  HOST: {
    label: 'Host',
    icon: '👑',
    className: 'bg-[var(--wm-accent-soft)] text-[var(--wm-accent)] border-[var(--wm-accent-border)]',
  },
  MODERATOR: {
    label: 'Moderator',
    icon: '🛡',
    className: 'bg-[rgba(45,212,191,0.12)] text-[var(--wm-presence)] border-[rgba(45,212,191,0.35)]',
  },
  PARTICIPANT: {
    label: 'Participant',
    icon: '👤',
    className: 'bg-[var(--wm-bg-elevated)] text-[var(--wm-text-muted)] border-[var(--wm-border)]',
  },
};

export default function RoleBadge({ role }: { role: Role }) {
  const config = CONFIG[role];
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${config.className}`}
    >
      <span aria-hidden="true">{config.icon}</span>
      {config.label}
    </span>
  );
}
