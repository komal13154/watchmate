import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/common/Logo';
import Button from '../components/common/Button';
import { listMyRooms, ApiError } from '../services/api';
import { useUser } from '../context/UserContext';
import type { RoomSummary } from '../types';

export default function MyRoomsPage() {
  const navigate = useNavigate();
  const { user, token } = useUser();
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setRooms([]);
    setError('');
    if (!user || !token) return () => { active = false; };

    listMyRooms(token)
      .then(({ rooms: nextRooms }) => {
        if (active) setRooms(nextRooms);
      })
      .catch((err) => {
        if (active) setError(err instanceof ApiError ? err.message : 'Could not load your rooms.');
      });

    return () => { active = false; };
  }, [user?.userId, token]);
  return <div className="min-h-screen"><header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between"><button onClick={() => navigate('/home')}><Logo /></button><Button variant="ghost" size="sm" onClick={() => navigate('/home')}>Dashboard</Button></header><main className="max-w-6xl mx-auto px-6 py-10"><h1 className="font-display font-extrabold text-4xl">My rooms</h1><p className="text-[var(--wm-text-muted)] mt-3">Rooms you host or have joined.</p>{error && <p className="text-sm text-[var(--wm-danger)] mt-8">{error}</p>}{rooms.length === 0 && !error && <p className="text-[var(--wm-text-muted)] mt-12">You haven&apos;t created or joined any rooms yet.</p>}<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">{rooms.map((room) => <button key={room.roomId} onClick={() => navigate(`/room/${room.roomId}`)} className="wm-card p-5 text-left hover:border-[var(--wm-accent-border)]"><span className="text-xs text-[var(--wm-text-faint)]">ROOM {room.roomId}</span><strong className="font-display text-lg block mt-4">{room.name}</strong></button>)}</div></main></div>;
}