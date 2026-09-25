import { useState } from 'react';
import Button from '../common/Button';
import Input from '../common/Input';
import { extractYouTubeId } from '../../utils/youtube';

export default function ChangeVideoModal({
  onSubmit,
  onClose,
}: {
  onSubmit: (url: string) => void;
  onClose: () => void;
}) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!extractYouTubeId(url)) {
      setError("That doesn't look like a valid YouTube link.");
      return;
    }
    onSubmit(url.trim());
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
    >
      <form onSubmit={handleSubmit} className="wm-card w-full max-w-sm p-6 flex flex-col gap-4">
        <h2 className="font-display font-semibold text-lg text-[var(--wm-text)]">Load a video</h2>
        <Input
          label="YouTube URL"
          placeholder="https://youtube.com/watch?v=…"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (error) setError('');
          }}
          error={error}
          autoFocus
        />
        <div className="flex gap-3 justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Load video</Button>
        </div>
      </form>
    </div>
  );
}
