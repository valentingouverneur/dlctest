import { useState, useEffect } from 'react';
import { onAuthChange } from '../lib/auth';

export function useAuth() {
  const [user, setUser] = useState(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthChange(session => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { user, loading };
}
