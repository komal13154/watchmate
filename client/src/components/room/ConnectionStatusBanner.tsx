import type { ConnectionStatus as ConnStatus } from '../../hooks/useRoomSocket';

export default function ConnectionStatusBanner({ status }: { status: ConnStatus }) {
  if (status === 'connected' || status === 'connecting') return null;

  const config = {
    reconnecting: {
      text: 'Connection lost. Reconnecting…',
      className: 'bg-[rgba(255,182,72,0.12)] text-[var(--wm-warning)] border-[rgba(255,182,72,0.3)]',
    },
    disconnected: {
      text: "You're offline. Trying to reconnect…",
      className: 'bg-[rgba(255,59,92,0.12)] text-[var(--wm-danger)] border-[rgba(255,59,92,0.3)]',
    },
  }[status];

  if (!config) return null;

  return (
    <div className={`text-center text-sm py-2 border-b ${config.className}`} role="status">
      {config.text}
    </div>
  );
}
