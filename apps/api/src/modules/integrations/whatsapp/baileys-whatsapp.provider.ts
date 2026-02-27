import { Injectable } from '@nestjs/common';
import { QrService } from '../../qr/qr.service';
import { SendMessageInput, SendMessageResult, WhatsappProviderPort } from './whatsapp-provider.port';

@Injectable()
export class BaileysWhatsappProvider implements WhatsappProviderPort {
  constructor(private readonly qrService: QrService) {}

  async sendTextMessage(input: SendMessageInput): Promise<SendMessageResult> {
    const sock = this.qrService.getSocket();
    if (!sock || !this.qrService.isConnected()) {
      throw new Error('Sessao Baileys desconectada. Conecte via QR antes de enviar.');
    }

    const jid = input.to.includes('@') ? input.to : `${input.to}@s.whatsapp.net`;
    const sent = await sock.sendMessage(jid, { text: input.text });

    return {
      externalMessageId: sent?.key?.id ?? `baileys-${Date.now()}`,
      acceptedAt: new Date().toISOString(),
    };
  }
}
