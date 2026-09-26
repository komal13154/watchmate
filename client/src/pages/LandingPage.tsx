import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/common/Logo';
import Button from '../components/common/Button';
import IdentityGate from '../components/common/IdentityGate';
import { LoadingState, ErrorState, EmptyState } from '../components/common/States';
import { useIdentityGate } from '../hooks/useIdentityGate';
import { joinRoom, listLiveRooms, ApiError } from '../services/api';
import type { RoomSummary } from '../types';
import { useUser } from '../context/UserContext';
import { connectSocket } from '../socket/socketClient';

const CATEGORIES = ['Movies', 'Anime', 'Gaming', 'Music', 'Sports', 'Education', 'Comedy'];

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { isGateOpen, requireIdentity, confirmIdentity, cancelIdentity } = useIdentityGate();

  const [rooms, setRooms] = useState<RoomSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let latestRequest = 0;
    const refreshRooms = () => {
      const requestId = ++latestRequest;
      listLiveRooms()
        .then(({ rooms: nextRooms }) => {
          if (cancelled || requestId !== latestRequest) return;
          setRooms((previous) => nextRooms.map((room) => {
            const current = previous?.find((item) => item.roomId === room.roomId);
            return current ? { ...room, viewerCount: current.viewerCount } : room;
          }));
        })
        .catch((err) => {
          if (!cancelled) setError(err instanceof ApiError ? err.message : 'Could not load live parties.');
        });
    };
    refreshRooms();
    const socket = connectSocket();
    function onRoomLiveUpdated(payload: { roomId: string; isLive: boolean; onlineCount?: number }) {
      setRooms((previous) => {
        if (!previous) return previous;
        const exists = previous.some((room) => room.roomId === payload.roomId);
        if (!payload.isLive) return previous.filter((room) => room.roomId !== payload.roomId);
        if (!exists) {
          refreshRooms();
          return previous;
        }
        return previous.map((room) => room.roomId === payload.roomId
          ? { ...room, viewerCount: payload.onlineCount ?? room.viewerCount }
          : room);
      });
    }
    socket.on('room_live_updated', onRoomLiveUpdated);
    return () => {
      cancelled = true;
      socket.off('room_live_updated', onRoomLiveUpdated);
    };
  }, []);

  function goCreate() {
    if (user) navigate('/create');
    else navigate('/auth');
  }
  function goJoin() {
    if (user) navigate('/join');
    else navigate('/auth');
  }

  function joinLiveRoom(roomId: string) {
    if (!user) {
      navigate('/auth');
      return;
    }
    requireIdentity(async (identity) => {
      try {
        await joinRoom(roomId, identity);
        navigate(`/room/${roomId}`);
      } catch {
        navigate(`/join?code=${encodeURIComponent(roomId)}`);
      }
    });
  }

  return (
    <div className="min-h-screen">
      <header className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-wrap items-center justify-between gap-4">
        <Logo />
        <nav className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 min-w-0">
          <button
            onClick={() => navigate('/discover')}
            className="text-sm text-[var(--wm-text-muted)] hover:text-[var(--wm-text)] transition-colors"
          >
            Discover
          </button>
          {user ? <Button variant="secondary" size="sm" onClick={() => navigate('/home')}>Open dashboard</Button> : <Button variant="secondary" size="sm" onClick={() => navigate('/auth')}>Sign in</Button>}
        </nav>
      </header>

      <section className="max-w-6xl mx-auto px-6 pt-12 pb-20 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h1 className="font-display font-extrabold text-5xl md:text-6xl leading-[1.05] tracking-tight text-[var(--wm-text)]">
            Watch together.
            <br />
            Talk together.
            <br />
            <span className="wm-gradient-text">React together.</span>
          </h1>
          <p className="mt-6 text-lg text-[var(--wm-text-muted)] max-w-md">
            Create a room, invite your friends, and watch YouTube together in real time — perfectly in sync,
            every play, pause, and seek.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" onClick={goCreate}>
              Create Watch Party
            </Button>
            <Button size="lg" variant="secondary" onClick={goJoin}>
              Join a Room
            </Button>
          </div>
          <div className="mt-8 flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <span
                key={c}
                className="text-xs font-medium px-2.5 py-1 rounded-full bg-[var(--wm-bg-elevated)] border border-[var(--wm-border)] text-[var(--wm-text-muted)]"
              >
                {c}
              </span>
            ))}
          </div>
        </div>

        <RoomPreviewMock />
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display font-semibold text-2xl text-[var(--wm-text)]">Live right now</h2>
          <button
            onClick={() => navigate('/discover')}
            className="text-sm font-medium text-[var(--wm-accent)] hover:underline"
          >
            See all
          </button>
        </div>

        {rooms === null && !error && <LoadingState label="Finding live parties…" />}
        {error && <ErrorState message={error} onRetry={() => window.location.reload()} />}
        {rooms && rooms.length === 0 && (
          <EmptyState
            title="No parties live yet"
            message="Be the first to start one — your friends can join with a link in seconds."
            action={
              <Button size="sm" onClick={goCreate}>
                Create Watch Party
              </Button>
            }
          />
        )}
        {rooms && rooms.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map((room) => (
              <button
                key={room.roomId}
                onClick={() => joinLiveRoom(room.roomId)}
                className="wm-card p-4 text-left hover:border-[var(--wm-text-faint)] transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--wm-live)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--wm-live)] wm-live-dot" />
                    LIVE
                  </span>
                  <span className="text-xs text-[var(--wm-text-faint)]">{room.viewerCount ?? 0} watching</span>
                </div>
                <h3 className="font-display font-semibold text-[var(--wm-text)] truncate">{room.name}</h3>
                <p className="text-xs text-[var(--wm-text-muted)] mt-1">{room.hostName ? `Hosted by ${room.hostName}` : room.category}</p>
                <p className="text-xs text-[var(--wm-text-faint)] mt-1">{room.viewerCount ?? 0} watching · {room.privacy}</p>
              </button>
            ))}
          </div>
        )}
      </section>

      {isGateOpen && <IdentityGate onConfirm={confirmIdentity} onCancel={cancelIdentity} />}
    </div>
  );
}

function RoomPreviewMock() {
  return (
    <div className="wm-card p-4 relative overflow-hidden">
      <div className="aspect-video rounded-lg bg-[var(--wm-bg-elevated)] flex items-center justify-center relative overflow-hidden">
        <DemoVideo />
        <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 text-xs font-medium text-white bg-black/40 backdrop-blur px-2 py-1 rounded-full">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--wm-live)] wm-live-dot" />
          LIVE
        </span>
        <span className="absolute bottom-3 right-3 text-xs text-white/80">12:47</span>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="flex -space-x-2">
          {['🦊', '🐼', '🦄', '🐧'].map((a, i) => (
            <span
              key={i}
              className="h-8 w-8 rounded-full bg-[var(--wm-bg-elevated)] border-2 border-[var(--wm-bg-card)] flex items-center justify-center text-sm"
            >
              {a}
            </span>
          ))}
        </div>
        <span className="text-xs text-[var(--wm-presence)] font-medium">4 watching</span>
      </div>

      <div className="flex gap-2 mt-3">
        {['❤️', '😂', '🔥'].map((emoji) => (
          <span
            key={emoji}
            className="h-7 w-7 rounded-full bg-[var(--wm-bg-elevated)] border border-[var(--wm-border)] flex items-center justify-center text-xs"
          >
            {emoji}
          </span>
        ))}
      </div>
    </div>
  );
}

function DemoVideo() {
  return (
    <video
      src="/demo-video.mp4"
      autoPlay
      muted
      loop
      playsInline
      controls={false}
      className="absolute inset-0 object-cover pointer-events-none"
      aria-hidden="true"
    />
  );
}
