import { IsOptional, IsString } from 'class-validator';

export class AssignConversationDto {
  @IsString()
  userId!: string;
}

export class SendMessageDto {
  @IsString()
  conversationId!: string;

  @IsString()
  accountId!: string;

  @IsString()
  to!: string;

  @IsString()
  text!: string;
}

export class ListConversationsQuery {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  agentId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;
}
