import { Injectable, Logger } from '@nestjs/common';
import * as QRCode from 'qrcode';
import { WebhooksService } from '../webhooks/webhooks.service';
import { rm } from 'fs/promises';
import { join } from 'path';
import pino from 'pino';

export type QrSessionStatus = 'DISCONNECTED' | 'WAITING_QR' | 'CONNECTED';

// Motivo: Caminho absoluto para evitar problemas com cwd diferente ao rodar via PM2
const AUTH_DIR = join(process.cwd(), 'apps', 'api', '.baileys_auth');

// Motivo: Logger do Pino necessário para o Baileys funcionar corretamente
const baileysLogger = pino({ level: 'warn' });

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
  private reconnectTimer: NodeJS.Timeout | null = null;

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
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      const baileys = await import('@whiskeysockets/baileys');
      const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } = baileys;

      const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
      this.currentAccountId = accountId ?? this.currentAccountId;
      this.lastError = null;

      // Motivo: Buscar a versão mais recente do WA para evitar rejeição por versão desatualizada
      let version: [number, number, number] | undefined;
      try {
        const { version: latestVersion } = await fetchLatestBaileysVersion();
        version = latestVersion;
        this.logger.log(`Usando versão do WhatsApp: ${latestVersion.join('.')}`);
      } catch {
        this.logger.warn('Não foi possível buscar versão do WA, usando padrão');
      }

      const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: baileysLogger,
        // Motivo: Usar fingerprint padrão do Baileys para evitar bloqueio
        browser: baileys.Browsers.ubuntu('Chrome'),
        // Motivo: Usar a versão mais recente do protocolo WA
        ...(version ? { version } : {}),
        // Motivo: Não sincronizar histórico completo reduz chance de desconexão
        syncFullHistory: false,
        // Motivo: Timeout de conexão mais generoso para servidores remotos
        connectTimeoutMs: 60000,
        // Motivo: Delay entre requisições para evitar rate-limiting
        retryRequestDelayMs: 250,
        // Motivo: Handler obrigatório no Baileys v6 para retry de mensagens
        getMessage: async () => {
          return { conversation: '' };
        },
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
          this.logger.log('QR Code gerado, aguardando leitura...');
        }

        if (connection === 'open') {
          this.status = 'CONNECTED';
          this.qrDataUrl = null;
          this.updatedAt = new Date().toISOString();
          this.retryCount = 0;
          this.logger.log('Sessao WhatsApp Web conectada');
        }

        if (connection === 'close') {
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
          const reason = lastDisconnect?.error?.message ?? 'Connection closed';
          this.lastError = reason;
          this.status = 'DISCONNECTED';
          // Motivo: QR anterior expira ao fechar stream; evita escaneamento de QR invalido
          this.qrDataUrl = null;
          this.updatedAt = new Date().toISOString();
          this.sock = null;

          this.logger.warn(`Conexao fechada: ${reason} (statusCode: ${statusCode})`);

          if (shouldReconnect && this.retryCount < this.maxRetries) {
            this.retryCount += 1;
            const waitMs = Math.min(20000, 3000 * this.retryCount);
            this.logger.warn(
              `Tentativa ${this.retryCount}/${this.maxRetries} em ${waitMs}ms`,
            );
            this.reconnectTimer = setTimeout(() => {
              this.starting = false;
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
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

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
      await rm(AUTH_DIR, { recursive: true, force: true });
    } catch {
      // ignore
    }
    this.lastError = null;
    this.retryCount = 0;
    return this.getSession();
  }
}
