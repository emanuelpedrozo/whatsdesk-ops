import { Body, Controller, Get, Post } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { QrService } from './qr.service';
import { StartQrSessionDto } from './qr.dto';

@Controller('qr')
export class QrController {
  constructor(private readonly qr: QrService) {}

  @Roles('Admin', 'Supervisor', 'Gerente')
  @Get('session')
  getSession() {
    return this.qr.getSession();
  }

  @Roles('Admin', 'Supervisor', 'Gerente')
  @Post('session/start')
  async start(@Body() dto: StartQrSessionDto) {
    return this.qr.startSession(dto.accountId);
  }

  @Roles('Admin', 'Supervisor', 'Gerente')
  @Post('session/confirm')
  confirm() {
    return this.qr.confirmScan();
  }

  @Roles('Admin', 'Supervisor', 'Gerente')
  @Post('session/disconnect')
  disconnect() {
    return this.qr.disconnect();
  }

  @Roles('Admin', 'Supervisor', 'Gerente')
  @Post('session/reset')
  reset() {
    return this.qr.reset();
  }
}
