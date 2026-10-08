import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/jwt-auth.guard';
import { UserRole } from '../users/entities/user.entity';

@Controller('api/maintenance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MaintenanceController {
  constructor(private maintenanceService: MaintenanceService) {}

  @Get()
  findAll(@Query('facility') facility?: string, @Query('floor') floor?: string, @Request() req?: any) {
    if (req.user.role === UserRole.ADMIN && req.user.facility) {
      return this.maintenanceService.findAll(req.user.facility, floor);
    }
    return this.maintenanceService.findAll(facility, floor);
  }

  @Get('stats')
  countByStatus() {
    return this.maintenanceService.countByStatus();
  }

  @Get('machine/:machineId')
  findByMachine(@Param('machineId') machineId: number) {
    return this.maintenanceService.findByMachine(machineId);
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.maintenanceService.findOne(id);
  }

  @Post()
  @Roles(UserRole.MECHANIC, UserRole.SUPER_ADMIN)
  create(@Body() body: any, @Request() req: any) {
    return this.maintenanceService.create({ ...body, performedBy: req.user.name || req.user.username });
  }

  @Put(':id/status')
  updateStatus(@Param('id') id: number, @Body() body: { status: string }) {
    return this.maintenanceService.updateStatus(id, body.status as any);
  }
}
