'use client';

import type { OperationsDashboard } from '../types';

type SLAPanelProps = {
  slaPorConversa: OperationsDashboard['slaPorConversa'];
};

export function SLAPanel({ slaPorConversa }: SLAPanelProps) {
  return (
    <article className="panel">
      <h2>SLA por Conversa</h2>
      <div className="rows">
        {(slaPorConversa ?? []).map((item) => (
          <div key={item.conversationId} className="row">
            <span>{item.conversationId.slice(0, 18)}...</span>
            <span>{item.assignedTo ?? 'Não atribuído'}</span>
            <span>{item.waitTime}</span>
          </div>
        ))}
      </div>
    </article>
  );
}
