'use client';

import type { OperationsDashboard } from '../types';

type KPICardsProps = {
  kpis: OperationsDashboard['kpis'];
};

export function KPICards({ kpis }: KPICardsProps) {
  return (
    <>
      <section className="kpi-grid">
        <article className="kpi-card">
          <h3>Total de Atendimentos</h3>
          <strong>{kpis.totalAtendimentos ?? 0}</strong>
        </article>
        <article className="kpi-card">
          <h3>Iniciados no período</h3>
          <strong>{kpis.iniciadosPeriodo ?? 0}</strong>
        </article>
        <article className="kpi-card alert">
          <h3>Aguardando atendimento</h3>
          <strong>{kpis.aguardandoAtendimento ?? 0}</strong>
        </article>
        <article className="kpi-card focus">
          <h3>Em atendimento</h3>
          <strong>{kpis.emAtendimento ?? 0}</strong>
        </article>
        <article className="kpi-card good">
          <h3>Finalizados</h3>
          <strong>{kpis.finalizados ?? 0}</strong>
        </article>
      </section>

      <section className="kpi-grid secondary">
        <article className="kpi-card">
          <h3>Agentes online</h3>
          <strong>{kpis.agentesOnline ?? 0}</strong>
        </article>
        <article className="kpi-card">
          <h3>Widgets acionados</h3>
          <strong>{kpis.widgetsAcionados ?? 0}</strong>
        </article>
        <article className="kpi-card">
          <h3>Tempo médio de espera</h3>
          <strong>{kpis.tempoMedioEspera ?? '00:00'}</strong>
        </article>
        <article className="kpi-card">
          <h3>Tempo médio de atendimento</h3>
          <strong>{kpis.tempoMedioAtendimento ?? '00:00'}</strong>
        </article>
        <article className="kpi-card">
          <h3>Avaliação do atendimento</h3>
          <strong>{kpis.avaliacaoAtendimento?.toFixed(1) ?? '5.0'} ★</strong>
        </article>
      </section>
    </>
  );
}
