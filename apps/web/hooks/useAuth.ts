import { useState, useEffect, useCallback } from 'react';
import { getAuthToken, setAuthToken, removeAuthToken } from '../components/api';

type MePayload = {
  id: string;
  name: string;
  email: string;
  role: { name: string };
};

/**
 * Hook para gerenciar autenticação
 */
export function useAuth() {
  const [me, setMe] = useState<MePayload | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setMe(null);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api'}/auth/me`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMe(data);
      } else {
        removeAuthToken();
        setMe(null);
      }
    } catch {
      removeAuthToken();
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback((token: string) => {
    setAuthToken(token);
    loadUser();
  }, [loadUser]);

  const logout = useCallback(() => {
    removeAuthToken();
    setMe(null);
  }, []);

  useEffect(() => {
    loadUser();

    const onAuthChanged = () => {
      loadUser().catch(() => undefined);
    };

    window.addEventListener('auth-changed', onAuthChanged);
    return () => window.removeEventListener('auth-changed', onAuthChanged);
  }, [loadUser]);

  return { me, loading, login, logout, refresh: loadUser };
}
