import { Injectable } from '@nestjs/common';
import { SendMessageInput, SendMessageResult, WhatsappProviderPort } from './whatsapp-provider.port';

@Injectable()
export class MockWhatsappProvider implements WhatsappProviderPort {
  async sendTextMessage(input: SendMessageInput): Promise<SendMessageResult> {
    return {
      externalMessageId: `mock-${input.conversationId}-${Date.now()}`,
      acceptedAt: new Date().toISOString(),
    };
  }
}
