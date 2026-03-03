'use client';

import { FormEvent, useState } from 'react';
import { apiFetch, getJson } from '../api';
import type { Agent, Department, AgentMetrics } from '../types';
import { validateEmail, validateRequired, validatePassword } from '../../utils/validation';
import { Button } from '../ui/Button';
import { toastManager } from '../ui/Toast';
import { useLoading } from '../../hooks/useLoading';

type AgentManagementProps = {
  agents: Agent[];
  departments: Department[];
  onRefresh: () => Promise<void>;
};

export function AgentManagement({ agents, departments, onRefresh }: AgentManagementProps) {
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentEmail, setNewAgentEmail] = useState('');
  const [newAgentPassword, setNewAgentPassword] = useState('atendente123');
  const [newAgentDepartmentId, setNewAgentDepartmentId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { loading, withLoading } = useLoading();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validação
    const newErrors: Record<string, string> = {};
    if (!validateRequired(newAgentName)) {
      newErrors.name = 'Nome é obrigatório';
    }
    if (!validateRequired(newAgentEmail)) {
      newErrors.email = 'Email é obrigatório';
    } else if (!validateEmail(newAgentEmail)) {
      newErrors.email = 'Email inválido';
    }
    const passwordValidation = validatePassword(newAgentPassword);
    if (!passwordValidation.valid) {
      newErrors.password = passwordValidation.error || 'Senha inválida';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    await withLoading(async () => {
      try {
        await apiFetch('/agents', {
          method: 'POST',
          body: JSON.stringify({
            name: newAgentName,
            email: newAgentEmail,
            password: newAgentPassword,
            departmentId: newAgentDepartmentId || undefined,
          }),
        });
        toastManager.show('Atendente cadastrado com sucesso!', 'success');
        setNewAgentName('');
        setNewAgentEmail('');
        setNewAgentPassword('atendente123');
        setNewAgentDepartmentId('');
        await onRefresh();
      } catch (error: any) {
        toastManager.show(error.message || 'Erro ao cadastrar atendente', 'error');
      }
    });
  };

  const handleToggleStatus = async (agent: Agent) => {
    await withLoading(async () => {
      try {
        await apiFetch(`/agents/${agent.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ online: agent.status !== 'ACTIVE' }),
        });
        toastManager.show(
          `Atendente ${agent.status === 'ACTIVE' ? 'colocado offline' : 'colocado online'}`,
          'success'
        );
        await onRefresh();
      } catch (error: any) {
        toastManager.show(error.message || 'Erro ao alterar status', 'error');
      }
    });
  };

  const handleUpdateAvailability = async (agent: Agent, status: 'AVAILABLE' | 'BUSY' | 'AWAY' | 'OFFLINE') => {
    await withLoading(async () => {
      try {
        await apiFetch(`/agents/${agent.id}/availability`, {
          method: 'PATCH',
          body: JSON.stringify({ availabilityStatus: status }),
        });
        const statusLabels: Record<string, string> = {
          AVAILABLE: 'Disponível',
          BUSY: 'Ocupado',
          AWAY: 'Ausente',
          OFFLINE: 'Offline',
        };
        toastManager.show(`Status alterado para ${statusLabels[status]}`, 'success');
        await onRefresh();
      } catch (error: any) {
        toastManager.show(error.message || 'Erro ao alterar disponibilidade', 'error');
      }
    });
  };

  return (
    <article className="panel">
      <h2>Gestão de Atendentes</h2>
      <form className="agent-form" onSubmit={handleSubmit}>
        <div>
          <input
            placeholder="Nome do atendente"
            value={newAgentName}
            onChange={(e) => setNewAgentName(e.target.value)}
            className={errors.name ? 'input-error' : ''}
          />
          {errors.name && <span className="field-error">{errors.name}</span>}
        </div>
        <div>
          <input
            placeholder="Email"
            type="email"
            value={newAgentEmail}
            onChange={(e) => setNewAgentEmail(e.target.value)}
            className={errors.email ? 'input-error' : ''}
          />
          {errors.email && <span className="field-error">{errors.email}</span>}
        </div>
        <div>
          <input
            placeholder="Senha inicial"
            type="password"
            value={newAgentPassword}
            onChange={(e) => setNewAgentPassword(e.target.value)}
            className={errors.password ? 'input-error' : ''}
          />
          {errors.password && <span className="field-error">{errors.password}</span>}
        </div>
        <select
          value={newAgentDepartmentId}
          onChange={(e) => setNewAgentDepartmentId(e.target.value)}
        >
          <option value="">Sem departamento</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <Button type="submit" loading={loading}>
          Cadastrar atendente
        </Button>
      </form>

      <div className="rows">
        {agents.map((agent) => {
          const availabilityStatus = agent.availabilityStatus || 'OFFLINE';
          const statusLabels: Record<string, string> = {
            AVAILABLE: 'Disponível',
            BUSY: 'Ocupado',
            AWAY: 'Ausente',
            OFFLINE: 'Offline',
          };
          const statusColors: Record<string, string> = {
            AVAILABLE: 'success',
            BUSY: 'warning',
            AWAY: 'neutral',
            OFFLINE: 'danger',
          };

          return (
            <div key={agent.id} className="row row-action">
              <span>{agent.name}</span>
              <span>{agent.department?.name ?? 'Sem departamento'}</span>
              <span>{agent.status === 'ACTIVE' ? 'Online' : 'Offline'}</span>
              <select
                value={availabilityStatus}
                onChange={(e) =>
                  handleUpdateAvailability(agent, e.target.value as 'AVAILABLE' | 'BUSY' | 'AWAY' | 'OFFLINE')
                }
                disabled={loading}
                style={{ minWidth: '120px' }}
              >
                <option value="AVAILABLE">Disponível</option>
                <option value="BUSY">Ocupado</option>
                <option value="AWAY">Ausente</option>
                <option value="OFFLINE">Offline</option>
              </select>
              <Button
                variant={agent.status === 'ACTIVE' ? 'neutral' : 'success'}
                onClick={() => handleToggleStatus(agent)}
                loading={loading}
              >
                {agent.status === 'ACTIVE' ? 'Colocar offline' : 'Colocar online'}
              </Button>
              <Button
                variant="neutral"
                onClick={async () => {
                  try {
                    const metrics = await getJson(`/operations/agent/${agent.id}/metrics`) as AgentMetrics;
                    alert(
                      `Métricas de ${agent.name}:\n` +
                      `Total de conversas: ${metrics.totalConversations}\n` +
                      `Resolvidas: ${metrics.resolvedConversations}\n` +
                      `Taxa de resolução: ${metrics.resolutionRate.toFixed(1)}%\n` +
                      `Tempo médio de resposta: ${metrics.avgFirstResponseTimeMinutes}min\n` +
                      `Tempo médio de resolução: ${metrics.avgResolutionTimeMinutes}min`
                    );
                  } catch {
                    toastManager.show('Erro ao carregar métricas', 'error');
                  }
                }}
              >
                Métricas
              </Button>
            </div>
          );
        })}
      </div>
    </article>
  );
}
