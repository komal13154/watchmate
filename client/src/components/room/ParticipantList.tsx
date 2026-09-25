import { useState } from 'react';
import ParticipantItem from './ParticipantItem';
import ConfirmDialog from '../common/ConfirmDialog';
import type { Participant } from '../../types';

interface ParticipantListProps {
  participants: Participant[];
  myUserId: string;
  isHost: boolean;
  onAssignRole: (userId: string, role: 'MODERATOR' | 'PARTICIPANT') => void;
  onRemove: (userId: string) => void;
  onTransferHost: (userId: string) => void;
}

type PendingAction =
  | { type: 'remove'; participant: Participant }
  | { type: 'transfer'; participant: Participant };

export default function ParticipantList({
  participants,
  myUserId,
  isHost,
  onAssignRole,
  onRemove,
  onTransferHost,
}: ParticipantListProps) {
  const [pending, setPending] = useState<PendingAction | null>(null);
  const onlineParticipants = participants.filter((p) => p.online);
  const onlineCount = onlineParticipants.length;

  return (
    <div className="flex flex-col h-full">
      <div className="px-1 pb-2 flex items-center justify-between">
        <h3 className="font-display font-semibold text-sm text-[var(--wm-text)]">People</h3>
        <span className="text-xs text-[var(--wm-presence)]">{onlineCount} watching</span>
      </div>
      <div className="flex-1 overflow-y-auto wm-scrollbar divide-y divide-[var(--wm-border-soft)]">
        {onlineParticipants.map((p) => (
          <ParticipantItem
            key={p.userId}
            participant={p}
            isMe={p.userId === myUserId}
            isHost={isHost}
            onPromote={() => onAssignRole(p.userId, 'MODERATOR')}
            onDemote={() => onAssignRole(p.userId, 'PARTICIPANT')}
            onRemove={() => setPending({ type: 'remove', participant: p })}
            onTransferHost={() => setPending({ type: 'transfer', participant: p })}
          />
        ))}
      </div>

      {pending?.type === 'remove' && (
        <ConfirmDialog
          title={`Remove ${pending.participant.username}?`}
          message="They'll be disconnected from the room immediately and can rejoin only with the room link."
          confirmLabel="Remove"
          danger
          onConfirm={() => {
            onRemove(pending.participant.userId);
            setPending(null);
          }}
          onCancel={() => setPending(null)}
        />
      )}
      {pending?.type === 'transfer' && (
        <ConfirmDialog
          title={`Make ${pending.participant.username} the Host?`}
          message="You'll become a Moderator. The new Host will have full control, including removing participants."
          confirmLabel="Transfer Host"
          onConfirm={() => {
            onTransferHost(pending.participant.userId);
            setPending(null);
          }}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
}
