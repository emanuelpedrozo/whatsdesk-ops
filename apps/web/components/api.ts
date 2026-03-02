const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function getAuthToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('auth_token') ?? '';
}

export function setAuthToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('auth_token', token);
}

export function removeAuthToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('auth_token');
}

export async function apiFetch(path: string, init?: RequestInit) {
  const token = getAuthToken();
  const headers = new Headers(init?.headers ?? {});
  if (!headers.has('Content-Type') && init?.body) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  });

  // Se token expirou, remover e lançar erro
  if (res.status === 401) {
    removeAuthToken();
    throw new ApiError(401, 'Sessão expirada. Faça login novamente.');
  }

  return res;
}

export async function getJson<T>(path: string): Promise<T> {
  const res = await apiFetch(path);
  if (!res.ok) {
    let errorMessage = `Erro ${res.status}`;
    try {
      const errorData = await res.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      // Se não conseguir parsear JSON, usar mensagem padrão
    }
    throw new ApiError(res.status, errorMessage);
  }
  return res.json() as Promise<T>;
}
