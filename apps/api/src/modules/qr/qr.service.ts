import { Injectable, Logger } from '@nestjs/common';
import * as QRCode from 'qrcode';
import { WebhooksService } from '../webhooks/webhooks.service';
import { rm } from 'fs/promises';

export type QrSessionStatus = 'DISCONNECTED' | 'WAITING_QR' | 'CONNECTED';

@Injectable()
export class QrService {
  private readonly logger = new Logger(QrService.name);
  private status: QrSessionStatus = 'DISCONNECTED';
  private qrDataUrl: string | null = null;
  private updatedAt: string = new Date().toISOString();
  private lastError: string | null = null;
  private retryCount = 0;
  private readonly maxRetries = 5;
  private starting = false;

  private sock: any = null;
  private currentAccountId: string | null = null;

  constructor(private readonly webhooks: WebhooksService) {}

  getSession() {
    return {
      status: this.status,
      qrDataUrl: this.qrDataUrl,
      updatedAt: this.updatedAt,
      mode: 'baileys',
      lastError: this.lastError,
      retryCount: this.retryCount,
    };
  }

  getSocket() {
    return this.sock;
  }

  isConnected() {
    return this.status === 'CONNECTED' && !!this.sock;
  }

  async startSession(accountId?: string) {
    if (this.starting) return this.getSession();
    this.starting = true;
    try {
      const baileys = await import('@whiskeysockets/baileys');
      const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = baileys;

      const { state, saveCreds } = await useMultiFileAuthState('apps/api/.baileys_auth');
      this.currentAccountId = accountId ?? this.currentAccountId;
      this.lastError = null;

      const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        browser: ['Painel Atendimento', 'Chrome', '1.0.0'],
      });

      this.sock = sock;
      this.status = 'WAITING_QR';
      this.updatedAt = new Date().toISOString();

      sock.ev.on('creds.update', saveCreds);

      sock.ev.on('connection.update', async (update: any) => {
        const { connection, qr, lastDisconnect } = update;

        if (qr) {
          this.qrDataUrl = await QRCode.toDataURL(qr, { margin: 1, width: 240 });
          this.status = 'WAITING_QR';
          this.updatedAt = new Date().toISOString();
        }

        if (connection === 'open') {
          this.status = 'CONNECTED';
          this.qrDataUrl = null;
          this.updatedAt = new Date().toISOString();
          this.logger.log('Sessao WhatsApp Web conectada');
        }

        if (connection === 'close') {
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
          const reason = lastDisconnect?.error?.message ?? 'Connection closed';
          this.lastError = reason;
          this.status = 'DISCONNECTED';
          this.updatedAt = new Date().toISOString();
          this.sock = null;

          if (shouldReconnect && this.retryCount < this.maxRetries) {
            this.retryCount += 1;
            const waitMs = Math.min(12000, 2000 * this.retryCount);
            this.logger.warn(
              `Conexao fechada (${reason}). Tentativa ${this.retryCount}/${this.maxRetries} em ${waitMs}ms`,
            );
            setTimeout(() => {
              this.startSession(this.currentAccountId ?? undefined).catch(() => undefined);
            }, waitMs);
          } else if (shouldReconnect) {
            this.logger.error(
              `Conexao falhou apos ${this.retryCount} tentativas. Verifique rede/firewall/VPN e tente novamente.`,
            );
          }
        }
      });

      sock.ev.on('messages.upsert', async (evt: any) => {
        const messages = evt?.messages ?? [];
        if (!messages.length) return;

        for (const msg of messages) {
          if (msg.key?.fromMe) continue;
          const remoteJid: string | undefined = msg.key?.remoteJid;
          if (!remoteJid || remoteJid.endsWith('@g.us')) continue;

          const from = remoteJid.replace('@s.whatsapp.net', '');
          const text =
            msg.message?.conversation ??
            msg.message?.extendedTextMessage?.text ??
            msg.message?.imageMessage?.caption ??
            '';

          if (!text) continue;

          await this.webhooks.processWhatsappWebhook({
            eventId: `baileys-${msg.key?.id ?? Date.now()}`,
            accountId: this.currentAccountId ?? 'baileys-account',
            messages: [
              {
                id: msg.key?.id ?? `baileys-${Date.now()}`,
                from,
                text,
                type: 'text',
              },
            ],
          });
        }
      });

      return this.getSession();
    } catch (error) {
      this.logger.error('Falha ao iniciar sessao Baileys', error as Error);
      this.lastError = error instanceof Error ? error.message : 'Erro desconhecido';
      this.status = 'DISCONNECTED';
      this.qrDataUrl = null;
      this.updatedAt = new Date().toISOString();
      throw error;
    } finally {
      this.starting = false;
    }
  }

  confirmScan() {
    return this.getSession();
  }

  async disconnect() {
    try {
      if (this.sock?.logout) {
        await this.sock.logout();
      }
    } catch {
      // ignore
    }

    this.status = 'DISCONNECTED';
    this.qrDataUrl = null;
    this.updatedAt = new Date().toISOString();
    this.sock = null;
    this.lastError = null;
    this.retryCount = 0;
    return this.getSession();
  }

  async reset() {
    await this.disconnect();
    try {
      await rm('apps/api/.baileys_auth', { recursive: true, force: true });
    } catch {
      // ignore
    }
    this.lastError = null;
    this.retryCount = 0;
    return this.getSession();
  }
}
