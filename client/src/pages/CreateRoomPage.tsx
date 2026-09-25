import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/common/Logo';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import SelectPills from '../components/common/SelectPills';
import IdentityGate from '../components/common/IdentityGate';
import { useIdentityGate } from '../hooks/useIdentityGate';
import { createRoom, ApiError } from '../services/api';
import type { Category, Privacy } from '../types';

const CATEGORIES: Category[] = [
  'Movies',
  'Anime',
  'Gaming',
  'Music',
  'Sports',
  'Education',
  'Comedy',
  'Other',
];
const PRIVACY_OPTIONS: Privacy[] = ['public', 'private'];

export default function CreateRoomPage() {
  const navigate = useNavigate();
  const { isGateOpen, requireIdentity, confirmIdentity, cancelIdentity } = useIdentityGate();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('Movies');
  const [privacy, setPrivacy] = useState<Privacy>('public');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [errors, setErrors] = useState<{ name?: string; youtubeUrl?: string; form?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors: typeof errors = {};
    if (!name.trim()) nextErrors.name = 'Give your watch party a name.';
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    requireIdentity(async (identity) => {
      setSubmitting(true);
      setErrors({});
      try {
        const { room } = await createRoom({
          name: name.trim(),
          category,
          privacy,
          youtubeUrl: youtubeUrl.trim() || undefined,
          userId: identity.userId,
          username: identity.username,
          avatar: identity.avatar,
        });
        const recent = JSON.parse(localStorage.getItem('watchmate:rooms') || '[]') as string[];
        localStorage.setItem('watchmate:rooms', JSON.stringify([room.roomId, ...recent.filter((id) => id !== room.roomId)].slice(0, 20)));
        navigate(`/room/${room.roomId}`);
      } catch (err) {
        if (err instanceof ApiError && err.code === 'INVALID_YOUTUBE_URL') {
          setErrors({ youtubeUrl: err.message });
        } else if (err instanceof ApiError) {
          setErrors({ form: err.message });
        } else {
          setErrors({ form: 'Something went wrong. Please try again.' });
        }
      } finally {
        setSubmitting(false);
      }
    });
  }

  return (
    <div className="min-h-screen">
      <header className="max-w-2xl mx-auto px-6 py-6">
        <button onClick={() => navigate('/')}>
          <Logo />
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-6 pb-24">
        <h1 className="font-display font-bold text-3xl text-[var(--wm-text)]">Create a watch party</h1>
        <p className="text-[var(--wm-text-muted)] mt-2">
          You'll become the Host — you control playback and can promote friends to Moderator.
        </p>

        <form onSubmit={handleSubmit} className="wm-card p-6 mt-8 flex flex-col gap-6">
          <Input
            label="Room name"
            placeholder="e.g. Friday Anime Night"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
            }}
            error={errors.name}
            maxLength={60}
          />

          <SelectPills label="Category" options={CATEGORIES} value={category} onChange={setCategory} />

          <SelectPills
            label="Privacy"
            options={PRIVACY_OPTIONS}
            value={privacy}
            onChange={setPrivacy}
          />
          <p className="text-xs text-[var(--wm-text-faint)] -mt-4">
            {privacy === 'public'
              ? 'Public rooms appear on Discover for anyone to join.'
              : 'Private rooms are only reachable with the room link or code.'}
          </p>

          <Input
            label="YouTube URL (optional)"
            placeholder="https://youtube.com/watch?v=…"
            value={youtubeUrl}
            onChange={(e) => {
              setYoutubeUrl(e.target.value);
              if (errors.youtubeUrl) setErrors((prev) => ({ ...prev, youtubeUrl: undefined }));
            }}
            error={errors.youtubeUrl}
            hint="You can also load a video after the room is created."
          />

          {errors.form && (
            <p className="text-sm text-[var(--wm-danger)] bg-[rgba(255,59,92,0.08)] rounded-lg px-3 py-2">
              {errors.form}
            </p>
          )}

          <Button type="submit" size="lg" loading={submitting}>
            Create Watch Party
          </Button>
        </form>
      </main>

      {isGateOpen && <IdentityGate onConfirm={confirmIdentity} onCancel={cancelIdentity} />}
    </div>
  );
}
