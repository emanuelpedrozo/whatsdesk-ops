import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { AgentsService } from './agents.service';
import { CreateAgentDto, UpdateAgentStatusDto } from './dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';

@Controller('agents')
export class AgentsController {
  constructor(private readonly agents: AgentsService) {}

  @Roles('Admin', 'Supervisor', 'Gerente')
  @Get()
  list() {
    return this.agents.list();
  }

  @Roles('Admin', 'Supervisor', 'Gerente')
  @Patch(':id/status')
  setStatus(
    @Param('id') id: string,
    @Body() dto: UpdateAgentStatusDto,
    @CurrentUser() currentUser: CurrentUserPayload,
  ) {
    return this.agents.setOnlineStatus(id, dto.online, currentUser.sub);
  }

  @Roles('Admin', 'Supervisor', 'Gerente')
  @Post()
  create(@Body() dto: CreateAgentDto, @CurrentUser() currentUser: CurrentUserPayload) {
    return this.agents.create(dto, currentUser.sub);
  }
}
