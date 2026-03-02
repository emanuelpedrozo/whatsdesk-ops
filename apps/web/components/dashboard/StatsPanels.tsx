'use client';

import type { OperationsDashboard } from '../types';

type StatsPanelsProps = {
  ops: OperationsDashboard;
};

export function StatsPanels({ ops }: StatsPanelsProps) {
  return (
    <section className="ops-grid">
      <article className="panel">
        <h2>Atendimentos por Agente</h2>
        <div className="rows">
          {(ops.atendimentosPorAgente ?? []).map((row) => (
            <div key={row.agentId} className="row">
              <span>{row.agentName}</span>
              <span>{row.atendimentos}</span>
              <span>{row.finalizados}</span>
            </div>
          ))}
        </div>
      </article>

      <article className="panel">
        <h2>Atendimentos por Departamento</h2>
        <div className="rows">
          {(ops.atendimentosPorDepartamento ?? []).map((row) => (
            <div key={row.departamento} className="row">
              <span>{row.departamento}</span>
              <span>{row.total}</span>
              <span>{row.percentual}%</span>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
