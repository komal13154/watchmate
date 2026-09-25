import { useState, useCallback } from 'react';
import { useUser } from '../context/UserContext';
import type { LocalUser } from '../types';

/**
 * Wrap any action that requires identity (create room, join room).
 * If the user hasn't set a display name yet, shows the IdentityGate modal
 * first and runs the action once they confirm.
 */
export function useIdentityGate() {
  const { user, token } = useUser();
  const [pendingAction, setPendingAction] = useState<((user: LocalUser) => void) | null>(null);

  const requireIdentity = useCallback(
    (action: (user: LocalUser) => void) => {
      if (user) {
        action(user);
      } else {
        setPendingAction(() => action);
      }
    },
    [user]
  );

  const confirmIdentity = useCallback(
    (_username: string, _avatar: string) => {
      if (user) pendingAction?.(user);
      setPendingAction(null);
    },
    [pendingAction, user]
  );

  const cancelIdentity = useCallback(() => setPendingAction(null), []);

  return {
    user,
    token,
    isGateOpen: pendingAction !== null,
    requireIdentity,
    confirmIdentity,
    cancelIdentity,
  };
}
