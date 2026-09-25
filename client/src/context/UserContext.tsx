import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { AuthUser } from '../types';
import { clearToken, getToken, saveToken } from '../services/api';

interface UserContextValue {
  user: AuthUser | null;
  token: string | null;
  signIn: (token: string, user: AuthUser) => void;
  signOut: () => void;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const raw = localStorage.getItem('watchmate:auth-user');
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => getToken());

  const signIn = useCallback((nextToken: string, nextUser: AuthUser) => {
    saveToken(nextToken);
    localStorage.setItem('watchmate:auth-user', JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const signOut = useCallback(() => {
    clearToken();
    localStorage.removeItem('watchmate:auth-user');
    localStorage.removeItem('watchmate:rooms');
    setToken(null);
    setUser(null);
  }, []);

  return <UserContext.Provider value={{ user, token, signIn, signOut }}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within a UserProvider');
  return ctx;
}
