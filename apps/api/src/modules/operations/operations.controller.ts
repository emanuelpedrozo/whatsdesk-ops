import { Controller, Get, Param, Query } from '@nestjs/common';
import { OperationsService } from './operations.service';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('operations')
export class OperationsController {
  constructor(private readonly operations: OperationsService) {}

  @Roles('Admin', 'Supervisor', 'Gerente')
  @Get('bootstrap')
  bootstrap() {
    return this.operations.bootstrap();
  }

  @Roles('Admin', 'Supervisor', 'Gerente')
  @Get('dashboard')
  dashboard() {
    return this.operations.dashboard();
  }

  @Roles('Admin', 'Supervisor', 'Gerente', 'Atendente')
  @Get('agent/:agentId/metrics')
  getAgentMetrics(
    @Param('agentId') agentId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.operations.getAgentMetrics(
      agentId,
      dateFrom ? new Date(dateFrom) : undefined,
      dateTo ? new Date(dateTo) : undefined,
    );
  }
}
