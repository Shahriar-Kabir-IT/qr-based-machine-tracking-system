import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { DowntimeService } from './downtime.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/jwt-auth.guard';
import { UserRole } from '../users/entities/user.entity';

@Controller('api/downtime')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DowntimeController {
  constructor(private downtimeService: DowntimeService) {}

  @Get()
  findAll(@Query('facility') facility?: string, @Query('floor') floor?: string, @Request() req?: any) {
    if (req.user.role === UserRole.ADMIN && req.user.facility) {
      return this.downtimeService.findAll(req.user.facility, floor);
    }
    return this.downtimeService.findAll(facility, floor);
  }

  @Get('active')
  findActive(@Request() req: any) {
    if (req.user.role === UserRole.MECHANIC && req.user.facility) {
      return this.downtimeService.findActive(req.user.facility, req.user.floor);
    }
    return this.downtimeService.findActive();
  }

  @Get('mechanic-kpi')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  mechanicKpi(@Query('mechanicUserId') mechanicUserId?: string) {
    return this.downtimeService.mechanicKpi(mechanicUserId ? Number(mechanicUserId) : undefined);
  }

  @Get('recent')
  recentActivity() {
    return this.downtimeService.recentActivity();
  }

  @Get('machine/:machineId')
  findByMachine(@Param('machineId') machineId: number) {
    return this.downtimeService.findByMachine(machineId);
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.downtimeService.findOne(id);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.LINE_CHIEF)
  create(@Body() body: any, @Request() req: any) {
    return this.downtimeService.create({
      ...body,
      reportedByUserId: req.user.id,
      reporterName: req.user.name || req.user.username,
    });
  }

  @Put(':id/acknowledge')
  @Roles(UserRole.SUPER_ADMIN, UserRole.MECHANIC)
  acknowledge(@Param('id') id: number, @Request() req: any) {
    return this.downtimeService.acknowledge(id, req.user.id, req.user.name || req.user.username);
  }

  @Put(':id/finish-repair')
  @Roles(UserRole.SUPER_ADMIN, UserRole.MECHANIC)
  finishRepair(@Param('id') id: number, @Body() body: { repairNote: string; sparePartsUsed: string }) {
    return this.downtimeService.finishRepair(id, body.repairNote, body.sparePartsUsed);
  }

  @Put(':id/verify')
  @Roles(UserRole.SUPER_ADMIN, UserRole.LINE_CHIEF)
  verify(@Param('id') id: number, @Body() body: { verificationNote: string }, @Request() req: any) {
    return this.downtimeService.verify(id, req.user.id, body.verificationNote);
  }
}
