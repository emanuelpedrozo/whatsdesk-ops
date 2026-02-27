import { Controller, Get } from '@nestjs/common';
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
}
