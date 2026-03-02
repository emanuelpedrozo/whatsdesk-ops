'use client';

type SummaryPanelProps = {
  whatsappAccountName: string;
  agentsCount: number;
  departmentsCount: number;
};

export function SummaryPanel({ whatsappAccountName, agentsCount, departmentsCount }: SummaryPanelProps) {
  return (
    <article className="panel">
      <h2>Resumo da Sessão</h2>
      <p>Conta ativa: {whatsappAccountName}</p>
      <p>Atendentes cadastrados: {agentsCount}</p>
      <p>Departamentos ativos: {departmentsCount}</p>
    </article>
  );
}
