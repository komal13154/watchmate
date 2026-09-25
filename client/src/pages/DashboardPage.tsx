import { useNavigate } from 'react-router-dom';
import Logo from '../components/common/Logo';
import Button from '../components/common/Button';
import { useUser } from '../context/UserContext';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, signOut } = useUser();
  if (!user) {
    navigate('/auth', { replace: true });
    return null;
  }
  const actions = [
    { title: 'Create Watch Party', detail: 'Start a room and set the tone.', path: '/create', accent: true },
    { title: 'Join with Room Code', detail: 'Enter a code from a friend.', path: '/join' },
    { title: 'Explore Public Rooms', detail: 'Find something live right now.', path: '/discover' },
    { title: 'My Rooms', detail: 'Return to parties you created or joined.', path: '/my-rooms' },
  ];
  return (
    <div className="min-h-screen">
      <header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <button onClick={() => navigate('/home')}><Logo /></button>
        <nav className="flex items-center gap-4">
          <button onClick={() => navigate('/home')} className="hidden md:block text-sm text-[var(--wm-text-muted)] hover:text-[var(--wm-text)]">Home</button>
          <button onClick={() => navigate('/discover')} className="text-sm text-[var(--wm-text-muted)] hover:text-[var(--wm-text)]">Discover</button>
          <button onClick={() => navigate('/join')} className="hidden sm:block text-sm text-[var(--wm-text-muted)] hover:text-[var(--wm-text)]">Join Rooms</button>
          <button onClick={() => navigate('/my-rooms')} className="hidden sm:block text-sm text-[var(--wm-text-muted)] hover:text-[var(--wm-text)]">My Rooms</button>
          <Button size="sm" onClick={() => navigate('/create')}>Create Party</Button>
          <span className="hidden lg:block text-sm text-[var(--wm-text-muted)]">{user.username}</span>
          <Button variant="ghost" size="sm" onClick={() => { signOut(); navigate('/'); }}>Logout</Button>
        </nav>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-12">
        <p className="text-sm uppercase tracking-[0.2em] text-[var(--wm-accent)]">Your watch space</p>
        <h1 className="font-display font-extrabold text-4xl sm:text-6xl mt-3">Good to see you, {user.username}.</h1>
        <p className="text-lg text-[var(--wm-text-muted)] mt-4 max-w-xl">Pick a room, invite your people, and press play when everyone is ready.</p>
        <div className="grid sm:grid-cols-2 gap-4 mt-12 max-w-4xl">{actions.map((action) => <button key={action.path} onClick={() => navigate(action.path)} className={`wm-card text-left p-6 min-h-44 flex flex-col justify-between hover:border-[var(--wm-accent-border)] transition-colors ${action.accent ? 'bg-[linear-gradient(135deg,rgba(255,106,69,.16),var(--wm-bg-card))]' : ''}`}><span className="text-xs uppercase tracking-[0.16em] text-[var(--wm-text-faint)]">{action.accent ? 'Start here' : 'WatchMate'}</span><span><strong className="font-display text-xl block">{action.title}</strong><span className="text-sm text-[var(--wm-text-muted)] mt-2 block">{action.detail}</span></span></button>)}</div>
      </main>
    </div>
  );
}