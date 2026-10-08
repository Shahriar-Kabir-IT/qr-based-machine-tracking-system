import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { SparePartsService } from './spare-parts.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/jwt-auth.guard';
import { UserRole } from '../users/entities/user.entity';

@Controller('api/spare-parts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SparePartsController {
  constructor(private sparePartsService: SparePartsService) {}

  @Get()
  findAll() {
    return this.sparePartsService.findAll();
  }

  @Get('pending')
  findPending() {
    return this.sparePartsService.findPending();
  }

  @Get('catalog/search')
  searchCatalog(@Query('q') q?: string, @Query('machineType') machineType?: string) {
    return this.sparePartsService.searchCatalog(q, machineType);
  }

  @Get('catalog/all')
  getCatalogAll(
    @Query('machineType') machineType?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.sparePartsService.getCatalogAll(machineType, search, Number(page) || 1, Number(limit) || 50);
  }

  @Get('catalog/machine-types')
  getCatalogMachineTypes() {
    return this.sparePartsService.getCatalogMachineTypes();
  }

  @Get('analytics')
  getAnalytics() {
    return this.sparePartsService.getAnalytics();
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.sparePartsService.findOne(id);
  }

  @Post()
  create(@Body() body: any, @Request() req: any) {
    return this.sparePartsService.create({
      ...body,
      requestedByUserId: req.user.id,
      requestedBy: body.requestedBy || req.user.name || req.user.username,
    });
  }

  @Put(':id/approve')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TECHNICAL_MANAGER)
  approve(@Param('id') id: number, @Request() req: any) {
    return this.sparePartsService.approve(id, req.user.id, req.user.name || req.user.username);
  }

  @Put(':id/reject')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TECHNICAL_MANAGER)
  reject(@Param('id') id: number, @Body() body: { reason: string }, @Request() req: any) {
    return this.sparePartsService.reject(id, req.user.id, body.reason);
  }

  @Put(':id/store-issue')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  storeIssue(@Param('id') id: number, @Request() req: any) {
    return this.sparePartsService.storeIssue(id, req.user.id);
  }

  @Put(':id/install')
  @Roles(UserRole.SUPER_ADMIN, UserRole.MECHANIC)
  install(@Param('id') id: number, @Request() req: any) {
    return this.sparePartsService.install(id, req.user.id);
  }
}
