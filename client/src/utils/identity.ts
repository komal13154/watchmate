import type { LocalUser } from '../types';

const STORAGE_KEY = 'watchmate:user';
const AVATAR_EMOJIS = ['🦊', '🐼', '🐸', '🐙', '🦄', '🐯', '🐨', '🦁', '🐧', '🦋'];

function randomUserId(): string {
  return `user_${Math.random().toString(36).slice(2, 12)}`;
}

export function randomAvatar(): string {
  return AVATAR_EMOJIS[Math.floor(Math.random() * AVATAR_EMOJIS.length)];
}

export function getLocalUser(): LocalUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.userId && parsed?.username) return parsed as LocalUser;
    return null;
  } catch {
    return null;
  }
}

export function saveLocalUser(user: { username: string; avatar: string }): LocalUser {
  const existing = getLocalUser();
  const fullUser: LocalUser = {
    userId: existing?.userId || randomUserId(),
    username: user.username.trim(),
    avatar: user.avatar,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fullUser));
  return fullUser;
}

export function clearLocalUser(): void {
  localStorage.removeItem(STORAGE_KEY);
}
