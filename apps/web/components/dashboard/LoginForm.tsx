'use client';

import React, { FormEvent, useState, useEffect } from 'react';
import { apiFetch, ApiError } from '../api';
import { useAuth } from '../../hooks/useAuth';
import { validateEmail, validateRequired } from '../../utils/validation';
import { Button } from '../ui/Button';
import { toastManager } from '../ui/Toast';

export function LoginForm() {
  const { login } = useAuth();
  const [email, setEmail] = useState('supervisor@local.dev');
  const [password, setPassword] = useState('admin123');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline' | null>(null);
  const [apiUrl, setApiUrl] = useState<string>('');

  // Motivo: Verificar se a API está acessível antes de tentar fazer login
  useEffect(() => {
    const checkApiHealth = async () => {
      setApiStatus('checking');
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
        // Motivo: Se a URL for relativa, usar o domínio atual; se for absoluta, usar como está
        const healthUrl = apiBase.startsWith('http://') || apiBase.startsWith('https://')
          ? `${apiBase}/health`
          : `${window.location.origin}${apiBase}/health`;
        
        setApiUrl(healthUrl);
        
        const res = await fetch(healthUrl, {
          method: 'GET',
          cache: 'no-store',
        });
        if (res.ok) {
          setApiStatus('online');
        } else {
          setApiStatus('offline');
        }
      } catch {
        setApiStatus('offline');
      }
    };
    checkApiHealth();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors({});

    // Validação
    const newErrors: { email?: string; password?: string } = {};
    if (!validateRequired(email)) {
      newErrors.email = 'Email é obrigatório';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Email inválido';
    }
    if (!validateRequired(password)) {
      newErrors.password = 'Senha é obrigatória';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        let errorMessage = 'Credenciais inválidas';
        try {
          const errorData = await res.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          // Se não conseguir parsear JSON, usar mensagem padrão
          if (res.status === 401) {
            errorMessage = 'Email ou senha incorretos';
          } else if (res.status === 500) {
            errorMessage = 'Erro interno do servidor. Tente novamente.';
          } else {
            errorMessage = `Erro ${res.status}: ${res.statusText}`;
          }
        }
        toastManager.show(errorMessage, 'error');
        return;
      }

      const body = (await res.json()) as { accessToken: string; user?: any };
      if (!body.accessToken) {
        toastManager.show('Resposta inválida do servidor', 'error');
        return;
      }

      await login(body.accessToken);
      toastManager.show(`Bem-vindo, ${body.user?.name || email}!`, 'success');
    } catch (error: unknown) {
      // Tratar diferentes tipos de erro
      let errorMessage = 'Erro ao fazer login';
      
      // Motivo: Verificar se é ApiError primeiro (tem status e message)
      if (error instanceof ApiError) {
        if (error.status === 502) {
          errorMessage = 'Backend não está respondendo. Verifique se a API está rodando.';
        } else if (error.status === 503) {
          errorMessage = 'Serviço temporariamente indisponível. Tente novamente.';
        } else {
          errorMessage = error.message || errorMessage;
        }
      } else if (error instanceof Error) {
        // Motivo: Tratar erros genéricos de Error
        if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
          errorMessage = 'Erro de conexão. Verifique se o servidor backend está rodando e acessível.';
        } else {
          errorMessage = error.message || errorMessage;
        }
      } else if (error && typeof error === 'object' && 'status' in error) {
        // Motivo: Tratar objetos de erro com status (fallback)
        const err = error as { status: number; message?: string };
        if (err.status === 502) {
          errorMessage = 'Backend não está respondendo. Verifique se a API está rodando na porta correta.';
        } else if (err.status === 503) {
          errorMessage = 'Serviço temporariamente indisponível. Tente novamente.';
        } else {
          errorMessage = err.message || errorMessage;
        }
      }
      
      toastManager.show(errorMessage, 'error');
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="ops-page">
      <header className="ops-head">
        <h1>Painel de Atendimento WhatsApp</h1>
        <p>Entre com um usuário para acessar o painel operacional.</p>
      </header>
      <section className="panel" style={{ maxWidth: 520 }}>
        <h2>Login</h2>
        <form className="login-form" onSubmit={handleSubmit}>
          <div>
            <input
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={errors.email ? 'input-error' : ''}
            />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </div>
          <div>
            <input
              placeholder="Senha"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={errors.password ? 'input-error' : ''}
            />
            {errors.password && <span className="field-error">{errors.password}</span>}
          </div>
          <Button type="submit" loading={loading}>
            Entrar
          </Button>
        </form>
        <p className="small-hint">
          Usuários seed: `admin@local.dev` / `supervisor@local.dev` com senha `admin123`.
        </p>
        {apiStatus === 'checking' && (
          <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
            Verificando conexão com o servidor...
          </p>
        )}
        {apiStatus === 'offline' && (
          <div style={{ 
            marginTop: '12px', 
            padding: '8px 12px', 
            background: '#fee', 
            border: '1px solid #fcc', 
            borderRadius: '4px',
            fontSize: '12px',
            color: '#c33'
          }}>
            ⚠️ Servidor backend não está acessível. Verifique se a API está rodando.
            <br />
            <small>URL testada: {apiUrl || (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api')}/health</small>
            <br />
            <small style={{ marginTop: '4px', display: 'block' }}>
              Dica: Verifique se o backend está rodando e se o proxy/nginx está configurado corretamente.
            </small>
          </div>
        )}
        {apiStatus === 'online' && (
          <p style={{ fontSize: '12px', color: '#3a3', marginTop: '8px' }}>
            ✓ Servidor conectado
          </p>
        )}
      </section>
    </main>
  );
}
