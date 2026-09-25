import type { ReactionEmoji } from '../../types';
import type { FloatingReaction } from '../../hooks/useRoomSocket';

const EMOJIS: ReactionEmoji[] = ['❤️', '😂', '🔥', '👏', '😮'];

export function ReactionBar({ onReact }: { onReact: (emoji: ReactionEmoji) => void }) {
  return (
    <div className="flex gap-2">
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onReact(emoji)}
          aria-label={`React with ${emoji}`}
          className="h-9 w-9 rounded-full bg-[var(--wm-bg-elevated)] border border-[var(--wm-border)] flex items-center justify-center text-base hover:border-[var(--wm-accent-border)] hover:bg-[var(--wm-accent-soft)] active:scale-90 transition-transform"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

export function ReactionAnimation({ reactions }: { reactions: FloatingReaction[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {reactions.map((r, i) => (
        <span
          key={r.id}
          className="absolute text-2xl"
          style={{
            left: `${15 + ((i * 17) % 70)}%`,
            bottom: '8%',
            animation: 'wm-float-up 2.1s ease-out forwards',
          }}
        >
          {r.emoji}
        </span>
      ))}
    </div>
  );
}
