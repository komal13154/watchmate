import Logo from '../common/Logo';
import type { RoomSummary } from '../../types';
import type { ConnectionStatus as ConnStatus } from '../../hooks/useRoomSocket';

interface RoomHeaderProps {
  room: RoomSummary;
  onlineCount: number;
  connectionStatus: ConnStatus;
  onInvite: () => void;
  onLeave: () => void;
  onClose?: () => void;
}

export default function RoomHeader({ room, onlineCount, connectionStatus, onInvite, onLeave, onClose }: RoomHeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-3 sm:px-6 py-3 border-b border-[var(--wm-border-soft)]">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Logo showWordmark={false} size={26} />
        <div className="min-w-0">
          <h1 className="font-display font-semibold text-sm text-[var(--wm-text)] truncate">{room.name}</h1>
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 text-[var(--wm-live)] font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--wm-live)] wm-live-dot" />
              LIVE
            </span>
            <span className="text-[var(--wm-text-faint)]">·</span>
            <span className="text-[var(--wm-presence)]">{onlineCount} watching</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2 min-w-0">
        <ConnectionBadge status={connectionStatus} />
        <button
          onClick={onInvite}
          className="text-xs sm:text-sm font-medium px-2 sm:px-3 py-1.5 rounded-lg bg-[var(--wm-bg-elevated)] border border-[var(--wm-border)] text-[var(--wm-text)] hover:border-[var(--wm-text-faint)] whitespace-nowrap"
        >
          Invite
        </button>
        <button
          onClick={onLeave}
          className="text-xs sm:text-sm font-medium px-2 sm:px-3 py-1.5 rounded-lg text-[var(--wm-text-muted)] hover:text-[var(--wm-text)] hover:bg-[var(--wm-bg-elevated)] whitespace-nowrap"
        >
          Leave
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="text-xs sm:text-sm font-medium px-2 sm:px-3 py-1.5 rounded-lg text-[var(--wm-danger)] hover:bg-[rgba(255,59,92,0.1)] whitespace-nowrap"
          >
            Close room
          </button>
        )}
      </div>
    </header>
  );
}

function ConnectionBadge({ status }: { status: ConnStatus }) {
  if (status === 'connected') return null; // silent when healthy — only surface trouble
  const config = {
    connecting: { label: 'Connecting…', color: 'text-[var(--wm-warning)]' },
    reconnecting: { label: 'Reconnecting…', color: 'text-[var(--wm-warning)]' },
    disconnected: { label: 'Disconnected', color: 'text-[var(--wm-danger)]' },
  }[status];
  return (
    <span className={`text-xs font-medium ${config.color} flex items-center gap-1.5`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current wm-live-dot" />
      {config.label}
    </span>
  );
}
