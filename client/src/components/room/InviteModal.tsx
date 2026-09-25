import { useState } from 'react';
import Button from '../common/Button';

export default function InviteModal({ roomId, onClose }: { roomId: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/room/${roomId}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="wm-card w-full max-w-sm p-6 flex flex-col gap-4">
        <h2 className="font-display font-semibold text-lg text-[var(--wm-text)]">Invite friends</h2>
        <p className="text-sm text-[var(--wm-text-muted)]">Anyone with this link can join the party.</p>

        <div className="rounded-lg bg-[var(--wm-bg-elevated)] border border-[var(--wm-border)] px-3 py-2.5 text-sm text-[var(--wm-text)] break-all font-mono">
          {link}
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--wm-text-muted)]">Room code</span>
          <span className="font-mono font-semibold text-[var(--wm-text)] tracking-wider">{roomId}</span>
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handleCopy}>{copied ? 'Copied!' : 'Copy link'}</Button>
        </div>
      </div>
    </div>
  );
}
