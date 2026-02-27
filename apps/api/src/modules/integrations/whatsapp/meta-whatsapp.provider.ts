import { Injectable } from '@nestjs/common';
import { SendMessageInput, SendMessageResult, WhatsappProviderPort } from './whatsapp-provider.port';

@Injectable()
export class MetaWhatsappProvider implements WhatsappProviderPort {
  async sendTextMessage(input: SendMessageInput): Promise<SendMessageResult> {
    const token = process.env.WHATSAPP_CLOUD_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID;

    if (!token || !phoneNumberId) {
      throw new Error('WHATSAPP_CLOUD_ACCESS_TOKEN e WHATSAPP_CLOUD_PHONE_NUMBER_ID sao obrigatorios');
    }

    const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: input.to,
        type: 'text',
        text: { body: input.text },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Falha ao enviar mensagem na Cloud API: ${response.status} ${body}`);
    }

    const body = (await response.json()) as { messages?: Array<{ id: string }> };

    return {
      externalMessageId: body.messages?.[0]?.id ?? `meta-${Date.now()}`,
      acceptedAt: new Date().toISOString(),
    };
  }
}
