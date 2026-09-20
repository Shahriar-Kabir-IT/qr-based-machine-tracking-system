import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request, Res } from '@nestjs/common';
import { TransfersService } from './transfers.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/jwt-auth.guard';
import { UserRole } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';

@Controller('api/transfers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TransfersController {
  constructor(
    private transfersService: TransfersService,
    private usersService: UsersService,
  ) {}

  @Get()
  findAll(@Query() query: { facility?: string }) {
    return this.transfersService.findAll(query.facility);
  }

  @Get('loaned')
  findLoaned(@Query() query: { facility?: string }) {
    return this.transfersService.findLoaned(query.facility);
  }

  @Get('overdue')
  findOverdue() {
    return this.transfersService.findOverdue();
  }

  @Get('return-requests')
  findReturnRequests() {
    return this.transfersService.findReturnRequests();
  }

  @Get(':id/chalan')
  async getChalan(@Param('id') id: number) {
    const t = await this.transfersService.findOne(id);
    if (!t || !t.chalanNo) return { error: 'Chalan not available' };
    const [requestedByUser, firstApprover, secondApprover] = await Promise.all([
      t.requestedBy ? this.usersService.findOne(t.requestedBy) : null,
      t.firstApprovedBy ? this.usersService.findOne(t.firstApprovedBy) : null,
      t.secondApprovedBy ? this.usersService.findOne(t.secondApprovedBy) : null,
    ]);
    return {
      chalanNo: t.chalanNo,
      date: t.secondApprovedAt,
      basis: t.basis,
      machine: {
        machineId: t.machine?.machineId,
        machineType: t.machine?.machineType,
        brand: t.machine?.brand,
        modelNo: t.machine?.modelNo,
        mfgSerialNo: t.machine?.mfgSerialNo,
      },
      from: { facility: t.fromFacility, floor: t.fromFloor, section: t.fromSection, line: t.fromLine },
      to: { facility: t.toFacility, floor: t.toFloor, section: t.toSection, line: t.toLine },
      reason: t.reason,
      expectedReturnDate: t.expectedReturnDate,
      requestedBy: requestedByUser?.name || 'N/A',
      firstApprovedBy: firstApprover?.name || 'N/A',
      secondApprovedBy: secondApprover?.name || 'N/A',
    };
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.transfersService.findOne(id);
  }

  @Post()
  create(@Body() body: any, @Request() req: any) {
    return this.transfersService.create({ ...body, requestedBy: req.user.id });
  }

  @Put(':id/first-approve')
  @Roles(UserRole.SUPER_ADMIN)
  firstApprove(@Param('id') id: number, @Request() req: any) {
    return this.transfersService.firstApprove(id, req.user.id);
  }

  @Put(':id/second-approve')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  secondApprove(@Param('id') id: number, @Request() req: any) {
    return this.transfersService.secondApprove(id, req.user.id);
  }

  @Put(':id/dispatch')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  dispatch(@Param('id') id: number, @Request() req: any) {
    return this.transfersService.dispatch(id, req.user.id);
  }

  @Put(':id/receive')
  receive(@Param('id') id: number, @Request() req: any) {
    return this.transfersService.receive(id, req.user.id);
  }

  @Put(':id/request-return')
  requestReturn(@Param('id') id: number, @Request() req: any) {
    return this.transfersService.requestReturn(id, req.user.id);
  }

  @Put(':id/approve-return')
  @Roles(UserRole.SUPER_ADMIN)
  approveReturn(@Param('id') id: number, @Request() req: any) {
    return this.transfersService.approveReturn(id, req.user.id);
  }

  @Put(':id/reject')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  reject(@Param('id') id: number, @Body() body: { reason: string }, @Request() req: any) {
    return this.transfersService.reject(id, req.user.id, body.reason);
  }
}
