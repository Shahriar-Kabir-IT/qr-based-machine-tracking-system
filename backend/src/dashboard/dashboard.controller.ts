import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MachinesService } from '../machines/machines.service';
import { TransfersService } from '../transfers/transfers.service';
import { DowntimeService } from '../downtime/downtime.service';
import { DowntimeStatus } from '../downtime/entities/downtime.entity';
import { MaintenanceService } from '../maintenance/maintenance.service';
import { SparePartsService } from '../spare-parts/spare-parts.service';

@Controller('api/dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(
    private machinesService: MachinesService,
    private transfersService: TransfersService,
    private downtimeService: DowntimeService,
    private maintenanceService: MaintenanceService,
    private sparePartsService: SparePartsService,
  ) {}

  @Get()
  async getDashboard() {
    const [
      totalMachines,
      reported,
      acknowledged,
      repairDone,
      inTransit,
      pendingMaintenance,
      sparePartsOpen,
      machinesByFloor,
      topMachineTypes,
      recentBreakdowns,
      loanedCount,
      overdueCount,
      overdueLoans,
      returnRequests,
    ] = await Promise.all([
      this.machinesService.count(),
      this.downtimeService.countByStatus(DowntimeStatus.REPORTED),
      this.downtimeService.countByStatus(DowntimeStatus.ACKNOWLEDGED),
      this.downtimeService.countByStatus(DowntimeStatus.REPAIR_DONE),
      this.transfersService.countInTransit(),
      this.maintenanceService.countByStatus(),
      this.sparePartsService.countNotInstalled(),
      this.machinesService.countByFloor(),
      this.machinesService.countByType(),
      this.downtimeService.recentActivity(),
      this.transfersService.countLoaned(),
      this.transfersService.countOverdue(),
      this.transfersService.findOverdue(),
      this.transfersService.findReturnRequests(),
    ]);

    return {
      stats: {
        totalMachines,
        underMaintenance: reported + acknowledged + repairDone,
        inTransit,
        pendingMaintenance: pendingMaintenance.incomplete,
        sparePartsOpen,
        loanedCount,
        overdueCount,
      },
      machinesByFloor,
      topMachineTypes,
      recentBreakdowns,
      overdueLoans,
      returnRequests,
    };
  }
}
