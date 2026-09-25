import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Logo from '../components/common/Logo';
import { ApiError, login, register, toAuthUser } from '../services/api';
import { useUser } from '../context/UserContext';

export default function AuthPage() {
  const navigate = useNavigate();
  const { signIn } = useUser();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = mode === 'login' ? await login({ email, password }) : await register({ name, email, password });
      signIn(result.token, toAuthUser(result.user));
      navigate('/home', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to connect to WatchMate.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen grid lg:grid-cols-[1.05fr_0.95fr]">
      <section className="hidden lg:flex flex-col justify-between p-12 bg-[var(--wm-bg-elevated)] border-r border-[var(--wm-border)]">
        <Logo />
        <div className="max-w-lg">
          <p className="text-sm uppercase tracking-[0.24em] text-[var(--wm-accent)]">Your shared screen</p>
          <h1 className="font-display font-extrabold text-6xl leading-none mt-4">Make room for the people you love.</h1>
          <p className="text-lg text-[var(--wm-text-muted)] mt-6">Synchronized video, live conversation, and a room that feels like yours.</p>
        </div>
        <p className="text-sm text-[var(--wm-text-faint)]">WatchMate · together, in sync</p>
      </section>
      <section className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-12"><Logo /></div>
          <p className="text-sm text-[var(--wm-text-muted)]">{mode === 'login' ? 'Welcome back' : 'Start your next watch party'}</p>
          <h2 className="font-display font-bold text-4xl mt-2">{mode === 'login' ? 'Sign in' : 'Create your account'}</h2>
          <div className="flex gap-6 border-b border-[var(--wm-border)] mt-8">
            {(['login', 'signup'] as const).map((tab) => <button key={tab} onClick={() => setMode(tab)} className={`pb-3 text-sm font-medium border-b-2 ${mode === tab ? 'text-[var(--wm-text)] border-[var(--wm-accent)]' : 'text-[var(--wm-text-muted)] border-transparent'}`}>{tab === 'login' ? 'Sign in' : 'Sign up'}</button>)}
          </div>
          <form onSubmit={submit} className="flex flex-col gap-5 mt-8">
            {mode === 'signup' && <Input label="Your name" value={name} onChange={(e) => setName(e.target.value)} required />}
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
            {error && <p role="alert" className="text-sm text-[var(--wm-danger)] bg-[rgba(255,59,92,0.1)] rounded-lg px-3 py-2">{error}</p>}
            <Button type="submit" size="lg" loading={loading}>{mode === 'login' ? 'Sign in to WatchMate' : 'Create account'}</Button>
          </form>
          <button onClick={() => navigate('/')} className="w-full text-center text-sm text-[var(--wm-text-muted)] hover:text-[var(--wm-text)] mt-6">Back to WatchMate</button>
        </div>
      </section>
    </main>
  );
}