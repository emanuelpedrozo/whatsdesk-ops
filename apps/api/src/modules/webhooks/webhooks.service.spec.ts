import { WebhooksService } from './webhooks.service';

describe('WebhooksService', () => {
  it('deduplica evento ja processado', async () => {
    const prisma: any = {
      webhookEvent: {
        upsert: jest.fn().mockResolvedValue({ id: 'evt1', processedAt: new Date() }),
      },
    };

    const realtime: any = { emitMessageCreated: jest.fn(), emitConversationUpdated: jest.fn() };
    const audit: any = { log: jest.fn() };

    const service = new WebhooksService(prisma, realtime, audit);
    const result = await service.processWhatsappWebhook({ eventId: 'abc', accountId: 'acc1' });

    expect(result).toEqual({ deduplicated: true });
    expect(realtime.emitMessageCreated).not.toHaveBeenCalled();
  });
});
