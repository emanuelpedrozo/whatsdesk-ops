import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CreateDealDto, MoveDealDto } from './dto';
import { PipelineService } from './pipeline.service';

@Controller('pipeline')
export class PipelineController {
  constructor(private readonly pipeline: PipelineService) {}

  @Get('stages')
  listStages() {
    return this.pipeline.listStages();
  }

  @Get('deals')
  listDeals() {
    return this.pipeline.listDeals();
  }

  @Post('deals')
  createDeal(@Body() dto: CreateDealDto) {
    return this.pipeline.createDeal(dto);
  }

  @Patch('deals/:id/move')
  moveDeal(@Param('id') id: string, @Body() dto: MoveDealDto) {
    return this.pipeline.moveDeal(id, dto);
  }
}
