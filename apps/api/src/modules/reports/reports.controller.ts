import { Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('sales/monthly')
  monthlySales(@Query('referenceDate') referenceDate?: string) {
    return this.reports.monthlySales(referenceDate);
  }

  @Get('sla/first-response')
  firstResponse() {
    return this.reports.firstResponseSlaHours();
  }
}
