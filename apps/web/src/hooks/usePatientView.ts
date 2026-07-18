import { useCallback, useEffect, useState } from 'react';
import { fetchPatientView, type PatientView } from '../api.js';

// Patient-scoped polling: only ever fetches THIS patient's record. No roster,
// no clinic inbox, no audit log on the wire.
export function usePatientView(patientId: string | null, intervalMs = 1000) {
  const [view, setView] = useState<PatientView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!patientId) return;
    try {
      const next = await fetchPatientView(patientId);
      setView(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to poll');
    }
  }, [patientId]);

  useEffect(() => {
    if (!patientId) {
      setView(null);
      return;
    }
    void refresh();
    const id = setInterval(() => void refresh(), intervalMs);
    return () => clearInterval(id);
  }, [refresh, intervalMs, patientId]);

  return { view, setView, error, refresh };
}
