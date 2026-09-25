import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '../../types';

interface ChatPanelProps {
  messages: ChatMessage[];
  myUserId: string;
  onSend: (text: string) => void;
}

export default function ChatPanel({ messages, myUserId, onSend }: ChatPanelProps) {
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setDraft('');
  }

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto wm-scrollbar flex flex-col gap-2 px-1 py-2">
        {messages.length === 0 && (
          <p className="text-xs text-[var(--wm-text-faint)] text-center py-6">
            No messages yet — say hi to the room.
          </p>
        )}
        {messages.map((m) =>
          m.system ? (
            <p key={m.messageId} className="text-xs text-[var(--wm-text-faint)] text-center">
              {m.text}
            </p>
          ) : (
            <div key={m.messageId} className={`flex flex-col ${m.userId === myUserId ? 'items-end' : 'items-start'}`}>
              <span className="text-[11px] text-[var(--wm-text-faint)] px-1">{m.username}</span>
              <div
                className={`max-w-[85%] rounded-xl px-3 py-1.5 text-sm break-words ${
                  m.userId === myUserId
                    ? 'bg-[image:var(--wm-gradient)] text-black'
                    : 'bg-[var(--wm-bg-elevated)] text-[var(--wm-text)] border border-[var(--wm-border)]'
                }`}
              >
                {m.text}
              </div>
            </div>
          )
        )}
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2 pt-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message…"
          maxLength={500}
          className="flex-1 rounded-lg bg-[var(--wm-bg-elevated)] border border-[var(--wm-border)] px-3 py-2 text-sm text-[var(--wm-text)] placeholder:text-[var(--wm-text-faint)] outline-none focus:border-[var(--wm-accent)]"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          aria-label="Send message"
          className="h-9 w-9 rounded-lg bg-[image:var(--wm-gradient)] disabled:opacity-40 flex items-center justify-center text-black shrink-0"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1 8l13-6.5L9.5 8 14 14.5 1 8z" />
          </svg>
        </button>
      </form>
    </div>
  );
}
