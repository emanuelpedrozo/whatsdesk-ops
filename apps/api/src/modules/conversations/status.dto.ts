import { IsIn } from 'class-validator';

export class UpdateConversationStatusDto {
  @IsIn(['OPEN', 'PENDING', 'RESOLVED', 'CLOSED'])
  status!: 'OPEN' | 'PENDING' | 'RESOLVED' | 'CLOSED';
}
