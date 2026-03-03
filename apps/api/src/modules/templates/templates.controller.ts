import { Body, Controller, Delete, Get, Param, Post, Patch, Query } from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto, UpdateTemplateDto } from './dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';

@Controller('templates')
export class TemplatesController {
  constructor(private readonly templates: TemplatesService) {}

  @Roles('Admin', 'Supervisor', 'Gerente', 'Atendente')
  @Get()
  list(@Query('departmentId') departmentId?: string, @CurrentUser() currentUser?: CurrentUserPayload) {
    return this.templates.list(departmentId, currentUser?.sub);
  }

  @Roles('Admin', 'Supervisor', 'Gerente', 'Atendente')
  @Get(':id')
  getById(@Param('id') id: string) {
    return this.templates.getById(id);
  }

  @Roles('Admin', 'Supervisor', 'Gerente', 'Atendente')
  @Post()
  create(@Body() dto: CreateTemplateDto, @CurrentUser() currentUser: CurrentUserPayload) {
    return this.templates.create(dto, currentUser.sub);
  }

  @Roles('Admin', 'Supervisor', 'Gerente', 'Atendente')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
    @CurrentUser() currentUser: CurrentUserPayload,
  ) {
    return this.templates.update(id, dto, currentUser.sub);
  }

  @Roles('Admin', 'Supervisor', 'Gerente', 'Atendente')
  @Delete(':id')
  delete(@Param('id') id: string, @CurrentUser() currentUser: CurrentUserPayload) {
    return this.templates.delete(id, currentUser.sub);
  }
}
