'use client';

import { useEffect, useState } from 'react';
import { apiFetch, getJson } from '../api';
import type { QrSession } from '../types';
import { Button } from '../ui/Button';
import { toastManager } from '../ui/Toast';
import { useLoading } from '../../hooks/useLoading';

type QRSectionProps = {
  whatsappAccountId: string | null;
  onRefresh: () => Promise<void>;
};

export function QRSection({ whatsappAccountId, onRefresh }: QRSectionProps) {
  const [qrSession, setQrSession] = useState<QrSession | null>(null);
  const { loading, withLoading } = useLoading();

  useEffect(() => {
    loadQRSession();
  }, []);

  // Polling enquanto nao conecta, para refletir retries/novo QR automaticamente
  useEffect(() => {
    if (!qrSession || qrSession.status === 'CONNECTED') return;
    const timer = setInterval(async () => {
      try {
        const qr = await getJson<QrSession>('/qr/session');
        setQrSession(qr);
      } catch {
        // ignore polling error
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [qrSession]);

  const loadQRSession = async () => {
    try {
      const qr = await getJson<QrSession>('/qr/session');
      setQrSession(qr);
    } catch {
      setQrSession(null);
    }
  };

  const handleStart = async () => {
    if (!whatsappAccountId) {
      toastManager.show('Nenhuma conta WhatsApp disponível', 'error');
      return;
    }

    await withLoading(async () => {
      try {
        const res = await apiFetch('/qr/session/start', {
          method: 'POST',
          body: JSON.stringify({ accountId: whatsappAccountId }),
        });
        if (!res.ok) {
          const txt = await res.text();
          toastManager.show(`Falha ao gerar QR: ${txt}`, 'error');
          return;
        }
        const session = (await res.json()) as QrSession;
        setQrSession(session);
        if (!session.qrDataUrl) {
          toastManager.show('Sessão iniciada. Aguarde alguns segundos para o QR aparecer.', 'info');
        } else {
          toastManager.show('QR gerado. Escaneie no WhatsApp.', 'success');
        }
      } catch (error: any) {
        toastManager.show(error.message || 'Erro ao iniciar sessão QR', 'error');
      }
    });
  };

  const handleConfirm = async () => {
    await withLoading(async () => {
      try {
        await apiFetch('/qr/session/confirm', { method: 'POST' });
        toastManager.show('Leitura confirmada', 'success');
        await loadQRSession();
        await onRefresh();
      } catch (error: any) {
        toastManager.show(error.message || 'Erro ao confirmar leitura', 'error');
      }
    });
  };

  const handleDisconnect = async () => {
    await withLoading(async () => {
      try {
        await apiFetch('/qr/session/disconnect', { method: 'POST' });
        toastManager.show('Sessão desconectada', 'success');
        await loadQRSession();
        await onRefresh();
      } catch (error: any) {
        toastManager.show(error.message || 'Erro ao desconectar', 'error');
      }
    });
  };

  const handleReset = async () => {
    await withLoading(async () => {
      try {
        await apiFetch('/qr/session/reset', { method: 'POST' });
        toastManager.show('Sessão resetada. Gere novo QR.', 'info');
        await loadQRSession();
        await onRefresh();
      } catch (error: any) {
        toastManager.show(error.message || 'Erro ao resetar sessão', 'error');
      }
    });
  };

  return (
    <article className="panel">
      <h2>Conexão WhatsApp Web (QR)</h2>
      <p>
        Status: <strong>{qrSession?.status ?? 'N/A'}</strong> | Modo: {qrSession?.mode ?? 'simulado'} | Tentativas: {qrSession?.retryCount ?? 0}
      </p>
      {qrSession?.lastError && <p className="small-error">Erro: {qrSession.lastError}</p>}
      {qrSession?.qrDataUrl && (
        <img src={qrSession.qrDataUrl} alt="QR WhatsApp Web" className="qr-image" />
      )}
      <div className="toolbar">
        <Button onClick={handleStart} loading={loading} disabled={!whatsappAccountId}>
          Gerar QR
        </Button>
        <Button onClick={handleConfirm} loading={loading} variant="neutral">
          Confirmar leitura
        </Button>
        <Button onClick={handleDisconnect} loading={loading} variant="outline">
          Desconectar
        </Button>
        <Button onClick={handleReset} loading={loading} variant="outline">
          Resetar sessão
        </Button>
      </div>
    </article>
  );
}
