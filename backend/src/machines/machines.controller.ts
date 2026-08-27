import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { MachinesService } from './machines.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/jwt-auth.guard';
import { UserRole } from '../users/entities/user.entity';

@Controller('api/machines')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MachinesController {
  constructor(private machinesService: MachinesService) {}

  @Get()
  findAll(@Query() query: { search?: string; floor?: string; machineType?: string; status?: string; facility?: string }, @Request() req: any) {
    if (req.user.role === UserRole.ADMIN && req.user.facility) {
      return this.machinesService.findAll({ ...query, facility: req.user.facility });
    }
    return this.machinesService.findAll(query);
  }

  @Get('my-requests')
  myRequests(@Request() req: any) {
    return this.machinesService.findBySubmitter(req.user.id);
  }

  @Get('stats/by-floor')
  countByFloor() {
    return this.machinesService.countByFloor();
  }

  @Get('stats/by-type')
  countByType() {
    return this.machinesService.countByType();
  }

  @Get('next-id')
  async nextId(@Query('facility') facility: string, @Query('type') type: string) {
    if (!facility || !type) return { machineId: '' };
    const machineId = await this.machinesService.generateMachineId(facility, type);
    return { machineId };
  }

  @Get('by-asset/:assetId')
  findByAssetId(@Param('assetId') assetId: string) {
    return this.machinesService.findByAssetId(assetId);
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.machinesService.findOne(id);
  }

  @Post()
  create(@Body() body: any, @Request() req: any) {
    return this.machinesService.create({
      ...body,
      submittedBy: req.user.id,
      submitterName: req.user.name || req.user.username,
    });
  }

  @Put(':id/first-approve')
  @Roles(UserRole.SUPER_ADMIN)
  firstApprove(@Param('id') id: number, @Request() req: any) {
    return this.machinesService.firstApprove(id, req.user.id);
  }

  @Put(':id/second-approve')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  secondApprove(@Param('id') id: number, @Request() req: any) {
    return this.machinesService.secondApprove(id, req.user.id);
  }

  @Put(':id/reject')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  reject(@Param('id') id: number, @Body() body: { reason: string }, @Request() req: any) {
    return this.machinesService.reject(id, req.user.id, body.reason);
  }
}
