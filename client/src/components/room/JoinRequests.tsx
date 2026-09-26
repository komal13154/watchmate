import type { JoinRequest } from '../../hooks/useRoomSocket';
import Button from '../common/Button';

interface JoinRequestsProps {
  requests: JoinRequest[];
  onApprove: (userId: string) => void;
  onReject: (userId: string) => void;
}

export default function JoinRequests({ requests, onApprove, onReject }: JoinRequestsProps) {
  if (requests.length === 0) return null;

  return (
    <section className="wm-card mx-3 sm:mx-4 mt-3 sm:mt-4 p-3 sm:p-4 max-h-56 overflow-y-auto wm-scrollbar">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="font-display font-semibold text-sm text-[var(--wm-text)]">Join requests</h2>
        <span className="text-xs text-[var(--wm-text-faint)]">{requests.length} waiting</span>
      </div>
      <div className="flex flex-col gap-2">
        {requests.map((request) => (
          <div key={request.userId} className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-[var(--wm-text)] min-w-0 flex-1 break-words">{request.username} wants to join</span>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" onClick={() => onApprove(request.userId)}>Allow</Button>
              <Button size="sm" variant="ghost" onClick={() => onReject(request.userId)}>Reject</Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
