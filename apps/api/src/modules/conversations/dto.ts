import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

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

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  @Type(() => Boolean)
  onlyMine?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class UpdateConversationPriorityDto {
  @IsString()
  priority!: string;
}
