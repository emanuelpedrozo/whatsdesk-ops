import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { AgentAvailabilityStatus } from '@prisma/client';

export class UpdateAgentStatusDto {
  @IsBoolean()
  online!: boolean;
}

export class UpdateAvailabilityStatusDto {
  @IsEnum(AgentAvailabilityStatus)
  availabilityStatus!: AgentAvailabilityStatus;
}

export class CreateAgentDto {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;
}
