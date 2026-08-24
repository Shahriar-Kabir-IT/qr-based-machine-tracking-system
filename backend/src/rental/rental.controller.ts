import { Controller, Get, Post, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { RentalService } from './rental.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/jwt-auth.guard';
import { UserRole } from '../users/entities/user.entity';

@Controller('api/rental')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RentalController {
  constructor(private rentalService: RentalService) {}

  @Get()
  findAll() {
    return this.rentalService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.rentalService.findOne(id);
  }

  @Post()
  create(@Body() body: any, @Request() req: any) {
    return this.rentalService.create({ ...body, requestedBy: req.user.id });
  }

  @Put(':id/approve')
  @Roles(UserRole.SUPER_ADMIN)
  approve(@Param('id') id: number, @Body() body: { justification: string }, @Request() req: any) {
    return this.rentalService.approve(id, req.user.id, body.justification);
  }

  @Put(':id/deny')
  @Roles(UserRole.SUPER_ADMIN)
  deny(@Param('id') id: number, @Body() body: { justification: string }, @Request() req: any) {
    return this.rentalService.deny(id, req.user.id, body.justification);
  }

  @Put(':id/confirm-receipt')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  confirmReceipt(@Param('id') id: number, @Request() req: any) {
    const role = req.user.role === 'admin' ? 'admin' : 'admin';
    return this.rentalService.confirmReceipt(id, req.user.id, role);
  }

  @Put(':id/confirm-condition')
  @Roles(UserRole.SUPER_ADMIN, UserRole.MECHANIC)
  confirmCondition(@Param('id') id: number, @Request() req: any) {
    return this.rentalService.confirmCondition(id, req.user.id);
  }

  @Put(':id/request-return')
  requestReturn(@Param('id') id: number, @Request() req: any) {
    return this.rentalService.requestReturn(id, req.user.id);
  }

  @Put(':id/approve-return')
  @Roles(UserRole.SUPER_ADMIN)
  approveReturn(@Param('id') id: number, @Request() req: any) {
    return this.rentalService.approveReturn(id, req.user.id);
  }

  @Put(':id/confirm-return')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  confirmReturn(@Param('id') id: number, @Request() req: any) {
    return this.rentalService.confirmReturn(id, req.user.id);
  }
}
