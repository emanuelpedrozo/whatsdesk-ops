import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CRM WhatsApp Vendas',
  description: 'Inbox, pipeline e pedidos para operacao comercial no WhatsApp',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
