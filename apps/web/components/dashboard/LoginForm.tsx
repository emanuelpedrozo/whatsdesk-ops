'use client';

import { FormEvent, useState } from 'react';
import { apiFetch } from '../api';
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
    } catch (error: any) {
      // Tratar diferentes tipos de erro
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          toastManager.show('Erro de conexão. Verifique se o servidor está rodando.', 'error');
        } else {
          toastManager.show(error.message || 'Erro ao fazer login', 'error');
        }
      } else {
        toastManager.show('Erro desconhecido ao fazer login', 'error');
      }
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
      </section>
    </main>
  );
}
