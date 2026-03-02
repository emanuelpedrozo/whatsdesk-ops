import { useState, useCallback } from 'react';

/**
 * Hook para gerenciar estados de carregamento
 */
export function useLoading(initialState: boolean = false) {
  const [loading, setLoading] = useState(initialState);

  const startLoading = useCallback(() => setLoading(true), []);
  const stopLoading = useCallback(() => setLoading(false), []);
  const withLoading = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    try {
      setLoading(true);
      return await fn();
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, startLoading, stopLoading, withLoading };
}
