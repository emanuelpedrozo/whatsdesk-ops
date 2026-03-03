import { Module, forwardRef } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { ConversationsModule } from '../conversations/conversations.module';

@Module({
  controllers: [WebhooksController],
  providers: [WebhooksService],
  exports: [WebhooksService],
  imports: [forwardRef(() => ConversationsModule)],
})
export class WebhooksModule {}
