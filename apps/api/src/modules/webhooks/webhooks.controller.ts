import { Body, Controller, Get, HttpCode, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { WhatsappWebhookDto } from './dto';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  @Public()
  @Get('whatsapp')
  verify(
    @Query('hub.mode') mode?: string,
    @Query('hub.verify_token') verifyToken?: string,
    @Query('hub.challenge') challenge?: string,
    @Res() res?: Response,
  ) {
    const expected = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? '';
    if (mode === 'subscribe' && verifyToken && verifyToken === expected && challenge) {
      return res?.status(200).send(challenge);
    }
    return res?.status(403).send('forbidden');
  }

  @Public()
  @Post('whatsapp')
  @HttpCode(200)
  async whatsapp(@Body() payload: WhatsappWebhookDto) {
    return this.webhooks.processWhatsappWebhook(payload);
  }
}
