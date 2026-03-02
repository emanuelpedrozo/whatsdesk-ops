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
        const errorData = await res.json().catch(() => ({}));
        toastManager.show(errorData.message || 'Credenciais inválidas', 'error');
        return;
      }

      const body = (await res.json()) as { accessToken: string };
      login(body.accessToken);
      toastManager.show('Login realizado com sucesso!', 'success');
    } catch (error: any) {
      toastManager.show(error.message || 'Erro ao fazer login', 'error');
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
