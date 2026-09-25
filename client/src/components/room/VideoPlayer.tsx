import { useEffect, useRef, useState } from 'react';
import { loadYouTubeApi, formatTime, type YTPlayer } from '../../utils/youtube';
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
  const [ready, setReady] = useState(false);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [seekPreview, setSeekPreview] = useState(0);

  // Create the underlying YT.Player once. All chrome is custom, so we disable
  // native controls entirely — the only thing that ever calls playVideo /
  // pauseVideo / seekTo is the "apply remote event" effect below.
  useEffect(() => {
    let destroyed = false;
    loadYouTubeApi().then(() => {
      if (destroyed || !containerRef.current || !window.YT) return;
      const player = new window.YT.Player(containerRef.current, {
        height: '100%',
        width: '100%',
        playerVars: {
          controls: 0,
          disablekb: 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
        },
        events: {
          onReady: () => {
            playerRef.current = player;
            setReady(true);
          },
        },
      });
    });
    return () => {
      destroyed = true;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, []);

  // Apply remote synchronization events. This is the ONLY path that mutates the
  // player — local button clicks below only ever emit to the server and wait
  // for the broadcast to come back through here, which is what makes an
  // emit -> apply feedback loop structurally impossible.
  useEffect(() => {
    if (!ready || !playerRef.current || !playbackEvent) return;
    const player = playerRef.current;

    if (playbackEvent.videoId && playbackEvent.videoId !== videoId) {
      setVideoId(playbackEvent.videoId);
      if (playbackEvent.isPlaying) {
        player.loadVideoById(playbackEvent.videoId, playbackEvent.time);
      } else {
        player.cueVideoById(playbackEvent.videoId, playbackEvent.time);
      }
      setIsPlaying(playbackEvent.isPlaying);
      setCurrentTime(playbackEvent.time);
      return;
    }

    if (playbackEvent.type === 'seek' || playbackEvent.type === 'sync') {
      player.seekTo(playbackEvent.time, true);
      setCurrentTime(playbackEvent.time);
    }
    if (playbackEvent.type === 'play' || (playbackEvent.type === 'sync' && playbackEvent.isPlaying)) {
      player.playVideo();
      setIsPlaying(true);
    } else if (playbackEvent.type === 'pause' || (playbackEvent.type === 'sync' && !playbackEvent.isPlaying)) {
      player.pauseVideo();
      setIsPlaying(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playbackEvent?.seq, ready]);

  // Poll for a live time readout + duration while playing.
  useEffect(() => {
    if (!ready) return;
    const interval = setInterval(() => {
      const player = playerRef.current;
      if (!player || seeking) return;
      const t = player.getCurrentTime?.();
      const d = player.getDuration?.();
      if (typeof t === 'number') setCurrentTime(t);
      if (typeof d === 'number' && d > 0) setDuration(d);
    }, 500);
    return () => clearInterval(interval);
  }, [ready, seeking]);

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
