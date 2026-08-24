import { Controller, Get, Post, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
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

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.sparePartsService.findOne(id);
  }

  @Post()
  create(@Body() body: any, @Request() req: any) {
    return this.sparePartsService.create({ ...body, requestedByUserId: req.user.id });
  }

  @Put(':id/approve')
  @Roles(UserRole.SUPER_ADMIN)
  approve(@Param('id') id: number, @Request() req: any) {
    return this.sparePartsService.approve(id, req.user.id);
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
