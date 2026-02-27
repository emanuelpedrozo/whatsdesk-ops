import { IsOptional, IsString } from 'class-validator';

export class StartQrSessionDto {
  @IsOptional()
  @IsString()
  accountId?: string;
}
