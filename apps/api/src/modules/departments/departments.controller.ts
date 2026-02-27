import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto';
import { DepartmentsService } from './departments.service';

@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departments: DepartmentsService) {}

  @Get()
  list() {
    return this.departments.list();
  }

  @Roles('Admin', 'Supervisor', 'Gerente')
  @Post()
  create(@Body() dto: CreateDepartmentDto) {
    return this.departments.create(dto);
  }

  @Roles('Admin', 'Supervisor', 'Gerente')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDepartmentDto) {
    return this.departments.update(id, dto);
  }
}
