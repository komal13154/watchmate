import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/common/Logo';
import Input from '../components/common/Input';
import { listLiveRooms, ApiError } from '../services/api';
import type { RoomSummary } from '../types';
import { joinRoom } from '../services/api';
import { useUser } from '../context/UserContext';
import { connectSocket } from '../socket/socketClient';

export default function DiscoverPage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    let latestRequest = 0;
    const refreshRooms = () => {
      const requestId = ++latestRequest;
      listLiveRooms()
        .then(({ rooms: nextRooms }) => {
          if (cancelled || requestId !== latestRequest) return;
          setRooms(nextRooms.filter((room) => room.privacy === 'public'));
        })
        .catch((err) => {
          if (!cancelled) setError(err instanceof ApiError ? err.message : 'Public rooms are unavailable right now.');
        });
    };
    refreshRooms();
    const socket = connectSocket();
    function onRoomLiveUpdated(payload: { roomId: string; isLive: boolean; onlineCount?: number }) {
      setRooms((previous) => {
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

  const visibleRooms = rooms.filter((room) => room.name.toLowerCase().includes(query.toLowerCase()));
  async function joinPublicRoom(roomId: string) {
    if (!user) {
      navigate('/auth');
      return;
    }
    try {
      await joinRoom(roomId, user);
      navigate(`/room/${roomId}`);
    } catch {
      navigate(`/join?code=${encodeURIComponent(roomId)}`);
    }
  }
  return (
    <div className="min-h-screen">
      <header className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-wrap items-center justify-between gap-4"><button onClick={() => navigate('/home')}><Logo /></button><button onClick={() => navigate('/home')} className="text-sm text-[var(--wm-text-muted)]">Dashboard</button></header>
      <main className="max-w-6xl mx-auto px-6 py-10">
        <p className="text-sm uppercase tracking-[0.2em] text-[var(--wm-accent)]">Open rooms</p>
        <h1 className="font-display font-extrabold text-3xl sm:text-4xl mt-3 break-words">Explore public rooms</h1>
        <p className="text-[var(--wm-text-muted)] mt-3">Browse live public parties and join without a code.</p>
        <div className="max-w-md mt-8"><Input label="Search rooms" placeholder="Find a room by name" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
        {error && <p className="text-sm text-[var(--wm-danger)] mt-8">{error}</p>}
        {!error && visibleRooms.length === 0 && <p className="text-[var(--wm-text-muted)] mt-12">No public rooms match that search.</p>}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">{visibleRooms.map((room) => <button key={room.roomId} onClick={() => joinPublicRoom(room.roomId)} className="wm-card p-5 text-left hover:border-[var(--wm-accent-border)] transition-colors"><span className="text-xs text-[var(--wm-live)]">LIVE · {room.viewerCount || 0} watching</span><strong className="font-display text-lg block mt-5 truncate">{room.name}</strong><span className="text-sm text-[var(--wm-text-muted)] block mt-2">{room.hostName ? `Hosted by ${room.hostName}` : 'Public room'} · Join</span></button>)}</div>
      </main>
    </div>
  );
}
