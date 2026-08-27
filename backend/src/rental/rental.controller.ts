import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { RentalService } from './rental.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/jwt-auth.guard';
import { UserRole } from '../users/entities/user.entity';

@Controller('api/rental')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RentalController {
  constructor(private rentalService: RentalService) {}

  @Get()
  findAll(@Query('factory') factory?: string, @Query('floor') floor?: string) {
    return this.rentalService.findFiltered(factory, floor);
  }

  @Get('active')
  findActive(@Query('factory') factory?: string, @Query('floor') floor?: string) {
    return this.rentalService.findActive(factory, floor);
  }

  @Get('security')
  @Roles(UserRole.SECURITY)
  findForSecurity(@Request() req: any) {
    return this.rentalService.findForSecurity(req.user.facility);
  }

  @Get('suggestions')
  getSuggestions(@Query('facility') facility?: string) {
    return this.rentalService.getSuggestions(facility);
  }

  @Get('history')
  findHistory(@Request() req: any) {
    const facility = req.user.role === 'security' ? req.user.facility : undefined;
    return this.rentalService.findHistory(facility);
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.rentalService.findOne(id);
  }

  @Post()
  create(@Body() body: any, @Request() req: any) {
    const factory = req.user.facility || body.factory;
    return this.rentalService.create({
      ...body,
      requestedBy: req.user.id,
      requestedByName: req.user.name,
      factory,
    });
  }

  @Put(':id/approve')
  @Roles(UserRole.SUPER_ADMIN)
  approve(@Param('id') id: number, @Body() body: { justification: string }, @Request() req: any) {
    return this.rentalService.approve(id, req.user.id, req.user.name, body.justification);
  }

  @Put(':id/deny')
  @Roles(UserRole.SUPER_ADMIN)
  deny(@Param('id') id: number, @Body() body: { justification: string }, @Request() req: any) {
    return this.rentalService.deny(id, req.user.id, req.user.name, body.justification);
  }

  @Put(':id/confirm-receipt')
  @Roles(UserRole.SECURITY)
  confirmReceipt(@Param('id') id: number, @Request() req: any) {
    return this.rentalService.confirmReceipt(id, req.user.id, req.user.name);
  }

  @Put(':id/confirm-condition')
  @Roles(UserRole.LINE_CHIEF, UserRole.MECHANIC)
  confirmCondition(@Param('id') id: number, @Body() body: { note: string }, @Request() req: any) {
    return this.rentalService.confirmCondition(id, req.user.id, req.user.name, body.note || 'OK', req.user.role, req.user.facility, req.user.floor);
  }

  @Put(':id/notify-return')
  @Roles(UserRole.LINE_CHIEF, UserRole.MECHANIC)
  notifyReturn(@Param('id') id: number, @Request() req: any) {
    return this.rentalService.notifyReturn(id, req.user.id, req.user.name);
  }

  @Put(':id/request-return')
  requestReturn(@Param('id') id: number, @Request() req: any) {
    return this.rentalService.requestReturn(id, req.user.id, req.user.name);
  }

  @Put(':id/approve-return')
  @Roles(UserRole.SUPER_ADMIN)
  approveReturn(@Param('id') id: number, @Request() req: any) {
    return this.rentalService.approveReturn(id, req.user.id, req.user.name);
  }

  @Put(':id/confirm-return')
  @Roles(UserRole.SECURITY)
  confirmReturn(@Param('id') id: number, @Request() req: any) {
    return this.rentalService.confirmReturn(id, req.user.id, req.user.name);
  }

  @Get(':id/spare-parts')
  getSparePartsByRental(@Param('id') id: number) {
    return this.rentalService.getSparePartsByRental(id);
  }

  @Post(':id/spare-parts')
  addSparePart(@Param('id') id: number, @Body() body: any, @Request() req: any) {
    return this.rentalService.addSparePart({
      rentalId: id,
      ...body,
      addedBy: req.user.id,
      addedByName: req.user.name,
    });
  }

  @Put('spare-parts/:partId')
  updateSparePart(@Param('partId') partId: number, @Body() body: any) {
    return this.rentalService.updateSparePart(partId, body);
  }

  @Delete('spare-parts/:partId')
  deleteSparePart(@Param('partId') partId: number) {
    return this.rentalService.deleteSparePart(partId);
  }
}
