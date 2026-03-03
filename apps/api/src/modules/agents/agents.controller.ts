import { Body, Controller, ForbiddenException, Get, Param, Patch, Post } from '@nestjs/common';
import { AgentsService } from './agents.service';
import { CreateAgentDto, UpdateAgentStatusDto, UpdateAvailabilityStatusDto } from './dto';
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

  @Roles('Admin', 'Supervisor', 'Gerente', 'Atendente')
  @Patch(':id/availability')
  updateAvailability(
    @Param('id') id: string,
    @Body() dto: UpdateAvailabilityStatusDto,
    @CurrentUser() currentUser: CurrentUserPayload,
  ) {
    // Motivo: Atendentes podem atualizar apenas seu próprio status
    if (currentUser.role === 'Atendente' && id !== currentUser.sub) {
      throw new ForbiddenException('Voce so pode atualizar seu proprio status');
    }
    return this.agents.updateAvailabilityStatus(id, dto, currentUser.sub);
  }

  @Roles('Admin', 'Supervisor', 'Gerente')
  @Post()
  create(@Body() dto: CreateAgentDto, @CurrentUser() currentUser: CurrentUserPayload) {
    return this.agents.create(dto, currentUser.sub);
  }
}
