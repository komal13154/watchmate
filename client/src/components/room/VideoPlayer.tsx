import { useEffect, useRef, useState } from 'react';
import { loadYouTubeApi, formatTime, PlayerState, type YTPlayer } from '../../utils/youtube';
import { EmptyState } from '../common/States';

interface PlaybackEvent {
  seq: number;
  type: 'sync' | 'play' | 'pause' | 'seek' | 'video_changed';
  videoId: string | null;
  time: number;
  isPlaying: boolean;
}

interface VideoPlayerProps {
  playbackEvent: PlaybackEvent | null;
  canControl: boolean;
  onPlay: (time: number) => void;
  onPause: (time: number) => void;
  onSeek: (time: number) => void;
}

export default function VideoPlayer({ playbackEvent, canControl, onPlay, onPause, onSeek }: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const pendingEventRef = useRef<PlaybackEvent | null>(null);
  const lastAppliedSeqRef = useRef(0);
  const canControlRef = useRef(canControl);
  const suppressedStateRef = useRef<{ state: number; expiresAt: number } | null>(null);
  const suppressedSeekRef = useRef<{ time: number; expiresAt: number } | null>(null);
  const lastSampleRef = useRef<{ time: number; state: number; at: number } | null>(null);
  const [ready, setReady] = useState(false);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [seekPreview, setSeekPreview] = useState(0);

  canControlRef.current = canControl;

  function suppressState(state: number) {
    suppressedStateRef.current = { state, expiresAt: Date.now() + 1500 };
  }

  function suppressSeek(time: number) {
    suppressedSeekRef.current = { time, expiresAt: Date.now() + 1500 };
  }

  function applyPlaybackEvent(event: PlaybackEvent) {
    const player = playerRef.current;
    if (!player || event.seq <= lastAppliedSeqRef.current) return;
    lastAppliedSeqRef.current = event.seq;

    if (event.videoId && event.videoId !== videoId) {
      setVideoId(event.videoId);
      setCurrentTime(event.time);
      setIsPlaying(event.isPlaying);
      suppressSeek(event.time);
      suppressState(event.isPlaying ? PlayerState.PLAYING : PlayerState.PAUSED);
      if (event.isPlaying) player.loadVideoById(event.videoId, event.time);
      else player.cueVideoById(event.videoId, event.time);
      return;
    }

    if (event.type === 'seek' || event.type === 'sync') {
      suppressSeek(event.time);
      player.seekTo(event.time, true);
      setCurrentTime(event.time);
    }
    if (event.type === 'play' || (event.type === 'sync' && event.isPlaying)) {
      suppressState(PlayerState.PLAYING);
      player.playVideo();
      setIsPlaying(true);
    } else if (event.type === 'pause' || (event.type === 'sync' && !event.isPlaying)) {
      suppressState(PlayerState.PAUSED);
      player.pauseVideo();
      setIsPlaying(false);
    }
  }

  function handlePlayerStateChange(state: number, player: YTPlayer) {
    const now = Date.now();
    const suppressed = suppressedStateRef.current;
    if (suppressed && suppressed.expiresAt >= now && suppressed.state === state) {
      suppressedStateRef.current = null;
      return;
    }
    if (suppressed && suppressed.expiresAt < now) suppressedStateRef.current = null;
    if (!canControlRef.current) return;

    const time = player.getCurrentTime?.() ?? currentTime;
    if (state === PlayerState.PLAYING) {
      setIsPlaying(true);
      setCurrentTime(time);
      onPlay(time);
    } else if (state === PlayerState.PAUSED) {
      setIsPlaying(false);
      setCurrentTime(time);
      onPause(time);
    } else if (state === PlayerState.ENDED) {
      setIsPlaying(false);
      setCurrentTime(time);
      onPause(time);
    }
  }

  // Native controls are enabled for the Host. The participant overlay blocks
  // direct interaction, while server-side permissions remain authoritative.
  useEffect(() => {
    let destroyed = false;
    loadYouTubeApi().then(() => {
      if (destroyed || !containerRef.current || !window.YT) return;
      const player = new window.YT.Player(containerRef.current, {
        height: '100%',
        width: '100%',
        playerVars: {
          controls: canControl ? 1 : 0,
          disablekb: canControl ? 0 : 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
        },
        events: {
          onReady: () => {
            playerRef.current = player;
            setReady(true);
            if (pendingEventRef.current) applyPlaybackEvent(pendingEventRef.current);
          },
          onStateChange: ({ data, target }) => handlePlayerStateChange(data, target),
        },
      });
    });
    return () => {
      destroyed = true;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, []);

  // Store every server event, then apply it immediately or when the player is ready.
  // Local button clicks only emit to the server and never call this function.
  useEffect(() => {
    pendingEventRef.current = playbackEvent;
    if (ready && playbackEvent) applyPlaybackEvent(playbackEvent);
  }, [playbackEvent, ready, videoId]);

  // Poll for the readout and detect native seek jumps. Normal playback progress
  // is ignored; only a discontinuity is sent through the existing seek event.
  useEffect(() => {
    if (!ready) return;
    const interval = setInterval(() => {
      const player = playerRef.current;
      if (!player || seeking) return;
      const t = player.getCurrentTime?.();
      const d = player.getDuration?.();
      const state = player.getPlayerState?.();
      const now = Date.now();
      if (typeof t === 'number') setCurrentTime(t);
      if (typeof d === 'number' && d > 0) setDuration(d);
      if (typeof t !== 'number' || typeof state !== 'number') return;

      const suppressedSeek = suppressedSeekRef.current;
      if (suppressedSeek) {
        if (Math.abs(t - suppressedSeek.time) < 1.5 || suppressedSeek.expiresAt < now) {
          suppressedSeekRef.current = null;
        }
      } else if (canControlRef.current && lastSampleRef.current) {
        const previous = lastSampleRef.current;
        const elapsed = (now - previous.at) / 1000;
        const expected = previous.state === PlayerState.PLAYING ? previous.time + elapsed : previous.time;
        if (Math.abs(t - expected) > 1.5) onSeek(t);
      }
      lastSampleRef.current = { time: t, state, at: now };
    }, 500);
    return () => clearInterval(interval);
  }, [ready, seeking, onSeek]);

  function handleTogglePlay() {
    if (!canControl) return;
    const time = playerRef.current?.getCurrentTime?.() ?? currentTime;
    if (isPlaying) onPause(time);
    else onPlay(time);
  }

  function handleSeekCommit(value: number) {
    setSeeking(false);
    if (!canControl) return;
    onSeek(value);
  }

  const hasVideo = !!(videoId ?? playbackEvent?.videoId);
  const displayTime = seeking ? seekPreview : currentTime;

  return (
    <div className="wm-card overflow-hidden">
      <div className="aspect-video bg-black relative">
        <div ref={containerRef} className="absolute inset-0" />
        {!hasVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--wm-bg-elevated)]">
            <EmptyState
              title="No video loaded"
              message={
                canControl
                  ? 'Paste a YouTube link below to start the party.'
                  : 'Waiting for the Host to load a video.'
              }
            />
          </div>
        )}
        {hasVideo && !canControl && (
          <div className="absolute inset-0" aria-hidden="true" title="Only the Host or a Moderator can control playback" />
        )}
      </div>

      {hasVideo && (
        <div className="p-4 flex flex-col gap-3">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={displayTime}
            disabled={!canControl}
            onChange={(e) => {
              setSeeking(true);
              setSeekPreview(Number(e.target.value));
            }}
            onMouseUp={(e) => handleSeekCommit(Number((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => handleSeekCommit(Number((e.target as HTMLInputElement).value))}
            className="w-full accent-[var(--wm-accent)] disabled:opacity-50"
            aria-label="Seek"
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handleTogglePlay}
                disabled={!canControl}
                aria-label={isPlaying ? 'Pause' : 'Play'}
                className="h-10 w-10 rounded-full bg-[image:var(--wm-gradient)] disabled:opacity-40 disabled:grayscale flex items-center justify-center text-black"
              >
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
              </button>
              <span className="text-xs text-[var(--wm-text-muted)] font-mono tabular-nums">
                {formatTime(displayTime)} / {formatTime(duration)}
              </span>
            </div>
            {!canControl && (
              <span className="text-xs text-[var(--wm-text-faint)]">Watch-only — ask the Host for controls</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <path d="M2 1.5v11l10-5.5-10-5.5z" />
    </svg>
  );
}
function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <rect x="2" y="1.5" width="3.5" height="11" />
      <rect x="8.5" y="1.5" width="3.5" height="11" />
    </svg>
  );
}
