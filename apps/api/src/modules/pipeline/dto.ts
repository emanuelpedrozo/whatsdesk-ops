import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateDealDto {
  @IsString()
  title!: string;

  @IsString()
  contactId!: string;

  @IsString()
  pipelineStageId!: string;

  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  valueCents?: number;
}

export class MoveDealDto {
  @IsString()
  toStageId!: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  lostReason?: string;
}
