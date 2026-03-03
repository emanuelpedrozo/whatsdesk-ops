import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AssignConversationDto, ListConversationsQuery, SendMessageDto, UpdateConversationPriorityDto } from './dto';
import { ConversationsService } from './conversations.service';
import { UpdateConversationStatusDto } from './status.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';

@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversations: ConversationsService) {}

  @Roles('Admin', 'Supervisor', 'Gerente', 'Atendente')
  @Get()
  list(@Query() query: ListConversationsQuery, @CurrentUser() currentUser?: CurrentUserPayload) {
    return this.conversations.list(query, currentUser?.sub);
  }

  @Roles('Admin', 'Supervisor', 'Gerente', 'Atendente')
  @Get(':id')
  getById(@Param('id') id: string) {
    return this.conversations.getById(id);
  }

  @Roles('Admin', 'Supervisor', 'Gerente', 'Atendente')
  @Patch(':id/assign')
  assign(
    @Param('id') id: string,
    @Body() dto: AssignConversationDto,
    @CurrentUser() currentUser: CurrentUserPayload,
  ) {
    return this.conversations.assign(id, dto.userId, currentUser.sub);
  }

  @Roles('Admin', 'Supervisor', 'Gerente', 'Atendente')
  @Patch(':id/self-assign')
  selfAssign(@Param('id') id: string, @CurrentUser() currentUser: CurrentUserPayload) {
    return this.conversations.selfAssign(id, currentUser.sub);
  }

  @Roles('Admin', 'Supervisor', 'Gerente', 'Atendente')
  @Post('send-message')
  sendMessage(@Body() dto: SendMessageDto, @CurrentUser() currentUser: CurrentUserPayload) {
    return this.conversations.sendMessage(dto, currentUser.sub);
  }

  @Roles('Admin', 'Supervisor', 'Gerente', 'Atendente')
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateConversationStatusDto,
    @CurrentUser() currentUser: CurrentUserPayload,
  ) {
    return this.conversations.updateStatus(id, dto.status, currentUser.sub);
  }

  @Roles('Admin', 'Supervisor', 'Gerente', 'Atendente')
  @Patch(':id/transfer')
  transfer(
    @Param('id') id: string,
    @Body() dto: AssignConversationDto,
    @CurrentUser() currentUser: CurrentUserPayload,
  ) {
    return this.conversations.transfer(id, dto.userId, currentUser.sub);
  }

  @Roles('Admin', 'Supervisor', 'Gerente', 'Atendente')
  @Patch(':id/priority')
  updatePriority(
    @Param('id') id: string,
    @Body() dto: UpdateConversationPriorityDto,
    @CurrentUser() currentUser: CurrentUserPayload,
  ) {
    return this.conversations.updatePriority(id, dto.priority as any, currentUser.sub);
  }

  @Roles('Admin', 'Supervisor', 'Gerente', 'Atendente')
  @Get(':id/history')
  getHistory(@Param('id') id: string) {
    return this.conversations.getHistory(id);
  }
}
