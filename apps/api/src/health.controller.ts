import { Controller, Get } from '@nestjs/common';
import { Public } from './modules/common/decorators/public.decorator';

@Controller()
export class HealthController {
  @Public()
  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'whatsdesk-api',
      timestamp: new Date().toISOString(),
    };
  }
}
