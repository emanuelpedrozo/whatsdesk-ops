import './globals.css';
import type { Metadata } from 'next';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';

export const metadata: Metadata = {
  title: 'CRM WhatsApp Vendas',
  description: 'Inbox, pipeline e pedidos para operacao comercial no WhatsApp',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}
