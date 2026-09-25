import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/common/Logo';
import Button from '../components/common/Button';
import IdentityGate from '../components/common/IdentityGate';
import { LoadingState, ErrorState, EmptyState } from '../components/common/States';
import { useIdentityGate } from '../hooks/useIdentityGate';
import { joinRoom, listLiveRooms, ApiError } from '../services/api';
import type { RoomSummary } from '../types';
import { useUser } from '../context/UserContext';
import { loadYouTubeApi, type YTPlayer } from '../utils/youtube';

const CATEGORIES = ['Movies', 'Anime', 'Gaming', 'Music', 'Sports', 'Education', 'Comedy'];
const DEMO_VIDEO_ID = "LYFBu8z3-Zw";
const DEMO_VIDEO_START = 10;
const DEMO_VIDEO_END = 20;

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { isGateOpen, requireIdentity, confirmIdentity, cancelIdentity } = useIdentityGate();

  const [rooms, setRooms] = useState<RoomSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listLiveRooms()
      .then(({ rooms }) => {
        if (!cancelled) setRooms(rooms);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Could not load live parties.');
      });
    const refresh = window.setInterval(() => {
      listLiveRooms().then(({ rooms }) => {
        if (!cancelled) setRooms(rooms);
      }).catch(() => undefined);
    }, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(refresh);
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
      <header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <Logo />
        <nav className="flex items-center gap-4">
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
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let player: YTPlayer | undefined;
    let intervalId: number | undefined;
    let cancelled = false;

    const createPlayer = () => {
      if (cancelled || !containerRef.current || !window.YT) return;
      player = new window.YT.Player(containerRef.current, {
        videoId: DEMO_VIDEO_ID,
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          loop: 1,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
          start: DEMO_VIDEO_START,
          playlist: DEMO_VIDEO_ID,
        },
        events: {
          onReady: ({ target }) => {
            target.seekTo(DEMO_VIDEO_START, true);
            target.playVideo();
              intervalId = window.setInterval(() => {
              if (target.getCurrentTime() >= DEMO_VIDEO_END) {
                target.seekTo(DEMO_VIDEO_START, true);
                target.playVideo();
              }
            }, 250);
          },
        },
      });
    };

    loadYouTubeApi().then(createPlayer);

    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
      player?.destroy();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none"
      aria-hidden="true"
    />
  );
}
