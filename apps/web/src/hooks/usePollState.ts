import { useCallback, useEffect, useState } from 'react';
import { fetchState, type ClientState } from '../api.js';

export function usePollState(intervalMs = 1000) {
  const [state, setState] = useState<ClientState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await fetchState();
      setState(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to poll');
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), intervalMs);
    return () => clearInterval(id);
  }, [refresh, intervalMs]);

  return { state, setState, error, refresh };
}
