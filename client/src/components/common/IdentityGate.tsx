import { useState } from 'react';
import Button from './Button';
import Input from './Input';
import { randomAvatar } from '../../utils/identity';

const AVATARS = ['🦊', '🐼', '🐸', '🐙', '🦄', '🐯', '🐨', '🦁', '🐧', '🦋', '🐳', '🦖'];

interface IdentityGateProps {
  onConfirm: (username: string, avatar: string) => void;
  onCancel: () => void;
  title?: string;
}

export default function IdentityGate({ onConfirm, onCancel, title = 'Pick a name' }: IdentityGateProps) {
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState(randomAvatar());
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) {
      setError('Enter a display name so others recognize you.');
      return;
    }
    if (trimmed.length > 24) {
      setError('Keep it under 24 characters.');
      return;
    }
    onConfirm(trimmed, avatar);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="identity-gate-title"
    >
      <form onSubmit={handleSubmit} className="wm-card w-full max-w-sm p-6 flex flex-col gap-5">
        <div>
          <h2 id="identity-gate-title" className="font-display font-semibold text-lg text-[var(--wm-text)]">
            {title}
          </h2>
          <p className="text-sm text-[var(--wm-text-muted)] mt-1">
            This is how you'll appear to everyone in the room.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-14 w-14 rounded-xl bg-[var(--wm-bg-elevated)] border border-[var(--wm-border)] flex items-center justify-center text-2xl shrink-0">
            {avatar}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {AVATARS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAvatar(a)}
                aria-label={`Choose avatar ${a}`}
                aria-pressed={a === avatar}
                className={`h-8 w-8 rounded-lg flex items-center justify-center text-base transition-colors ${
                  a === avatar
                    ? 'bg-[var(--wm-accent-soft)] ring-1 ring-[var(--wm-accent-border)]'
                    : 'hover:bg-[var(--wm-bg-elevated)]'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <Input
          label="Display name"
          placeholder="e.g. Komal"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            if (error) setError('');
          }}
          error={error}
          autoFocus
          maxLength={24}
        />

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Continue
          </Button>
        </div>
      </form>
    </div>
  );
}
