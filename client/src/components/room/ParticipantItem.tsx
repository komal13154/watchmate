import { useState } from 'react';
import RoleBadge from './RoleBadge';
import type { Participant } from '../../types';

interface ParticipantItemProps {
  participant: Participant;
  isMe: boolean;
  isHost: boolean; // is the CURRENT user the host
  onPromote: () => void;
  onDemote: () => void;
  onRemove: () => void;
  onTransferHost: () => void;
}

export default function ParticipantItem({
  participant,
  isMe,
  isHost,
  onPromote,
  onDemote,
  onRemove,
  onTransferHost,
}: ParticipantItemProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const canManage = isHost && !isMe && participant.role !== 'HOST';

  return (
    <div className="flex items-center gap-2.5 py-2 px-1 group relative">
      <span className="h-8 w-8 rounded-full bg-[var(--wm-bg-elevated)] border border-[var(--wm-border)] flex items-center justify-center text-sm shrink-0">
        {participant.avatar || '🙂'}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-[var(--wm-text)] truncate">
          {participant.username}
          {isMe && <span className="text-[var(--wm-text-faint)]"> (you)</span>}
        </p>
      </div>
      <RoleBadge role={participant.role} />
      {!participant.online && (
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--wm-text-faint)]" title="Offline" />
      )}

      {canManage && (
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={`Manage ${participant.username}`}
            aria-expanded={menuOpen}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-[var(--wm-text-muted)] hover:bg-[var(--wm-bg-elevated)] hover:text-[var(--wm-text)]"
          >
            ⋯
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-8 z-20 wm-card p-1 w-44 shadow-[var(--wm-shadow)]">
                {participant.role === 'PARTICIPANT' ? (
                  <MenuButton
                    onClick={() => {
                      onPromote();
                      setMenuOpen(false);
                    }}
                  >
                    Promote to Moderator
                  </MenuButton>
                ) : (
                  <MenuButton
                    onClick={() => {
                      onDemote();
                      setMenuOpen(false);
                    }}
                  >
                    Demote to Participant
                  </MenuButton>
                )}
                <MenuButton
                  onClick={() => {
                    onTransferHost();
                    setMenuOpen(false);
                  }}
                >
                  Transfer Host
                </MenuButton>
                <MenuButton
                  danger
                  onClick={() => {
                    onRemove();
                    setMenuOpen(false);
                  }}
                >
                  Remove
                </MenuButton>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function MenuButton({
  children,
  onClick,
  danger = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left text-sm px-2.5 py-1.5 rounded-lg hover:bg-[var(--wm-bg-elevated)] ${
        danger ? 'text-[var(--wm-danger)]' : 'text-[var(--wm-text)]'
      }`}
    >
      {children}
    </button>
  );
}
