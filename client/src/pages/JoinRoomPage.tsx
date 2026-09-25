import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Logo from '../components/common/Logo';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import IdentityGate from '../components/common/IdentityGate';
import { useIdentityGate } from '../hooks/useIdentityGate';
import { joinRoom, listRooms, ApiError } from '../services/api';
import type { RoomSummary } from '../types';

export default function JoinRoomPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isGateOpen, requireIdentity, confirmIdentity, cancelIdentity } = useIdentityGate();

  const [code, setCode] = useState(() => searchParams.get('code')?.trim().toUpperCase() || '');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [roomsError, setRoomsError] = useState('');

  useEffect(() => {
    listRooms()
      .then(({ rooms: nextRooms }) => setRooms(nextRooms))
      .catch((err) => setRoomsError(err instanceof ApiError ? err.message : 'Could not load the room directory.'));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Accept a bare code (WATCH7X4K) or a full pasted room URL.
    const trimmed = code.trim();
    const match = trimmed.match(/([A-Z0-9]{6,12})\/?$/i);
    const roomId = (match ? match[1] : trimmed).toUpperCase();

    if (!roomId) {
      setError('Enter a room code to continue.');
      return;
    }

    requireIdentity(async (identity) => {
      setChecking(true);
      setError('');
      try {
        await joinRoom(roomId, identity);
        navigate(`/room/${roomId}`);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Could not reach the server. Please try again.');
        }
      } finally {
        setChecking(false);
      }
    });
  }

  function joinDirectoryRoom(roomId: string) {
    const normalizedRoomCode = roomId.trim().toUpperCase();
    setCode(normalizedRoomCode);
    requireIdentity(async (identity) => {
      setChecking(true);
      setError('');
      try {
        await joinRoom(normalizedRoomCode, identity);
        navigate(`/room/${normalizedRoomCode}`);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Unable to connect to this room. Please try again.');
      } finally {
        setChecking(false);
      }
    });
  }

  return (
    <div className="min-h-screen">
      <header className="max-w-md mx-auto px-6 py-6">
        <button onClick={() => navigate('/')}>
          <Logo />
        </button>
      </header>

      <main className="max-w-md mx-auto px-6 pb-24">
        <h1 className="font-display font-bold text-3xl text-[var(--wm-text)]">Join a watch party</h1>
        <p className="text-[var(--wm-text-muted)] mt-2">
          Paste a room link or enter the code your friend shared.
        </p>

        <form onSubmit={handleSubmit} className="wm-card p-6 mt-8 flex flex-col gap-5">
          <Input
            label="Room code or link"
            placeholder="WATCH7X4K"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              if (error) setError('');
            }}
            error={error}
            autoFocus
            autoCapitalize="characters"
          />
          <Button type="submit" size="lg" loading={checking}>
            Join Watch Party
          </Button>
        </form>

        <section className="mt-12">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-xl text-[var(--wm-text)]">Room directory</h2>
            <span className="text-xs text-[var(--wm-text-faint)]">Public and private</span>
          </div>
          {roomsError && <p className="text-sm text-[var(--wm-danger)] mt-4">{roomsError}</p>}
          {!roomsError && rooms.length === 0 && <p className="text-sm text-[var(--wm-text-muted)] mt-4">No rooms are available yet.</p>}
          <div className="flex flex-col gap-3 mt-4">
            {rooms.map((room) => (
              <div key={room.roomId} className="wm-card p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-display font-semibold text-[var(--wm-text)] truncate">{room.name}</h3>
                  <p className="text-xs text-[var(--wm-text-muted)] mt-1">{room.privacy === 'public' ? 'Public room' : 'Private room · code required'}</p>
                </div>
                {room.privacy === 'public' ? (
                  <Button size="sm" onClick={() => joinDirectoryRoom(room.roomId)}>Join</Button>
                ) : (
                  <Button variant="secondary" size="sm" onClick={() => setCode(room.roomId)}>Use code</Button>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>

      {isGateOpen && <IdentityGate onConfirm={confirmIdentity} onCancel={cancelIdentity} title="Pick a name to join" />}
    </div>
  );
}
