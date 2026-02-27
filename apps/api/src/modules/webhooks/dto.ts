import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';

class WebhookMessage {
  @IsString()
  id!: string;

  @IsString()
  from!: string;

  @IsString()
  @IsOptional()
  text?: string;

  @IsString()
  @IsOptional()
  type?: string;
}

class WebhookStatus {
  @IsString()
  id!: string;

  @IsIn(['sent', 'delivered', 'read', 'failed'])
  status!: 'sent' | 'delivered' | 'read' | 'failed';

  @IsOptional()
  @IsString()
  error?: string;
}

export class WhatsappWebhookDto {
  @IsString()
  eventId!: string;

  @IsString()
  accountId!: string;

  @IsArray()
  @IsOptional()
  messages?: WebhookMessage[];

  @IsArray()
  @IsOptional()
  statuses?: WebhookStatus[];
}
