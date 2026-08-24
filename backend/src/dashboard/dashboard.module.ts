import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { MachinesModule } from '../machines/machines.module';
import { TransfersModule } from '../transfers/transfers.module';
import { DowntimeModule } from '../downtime/downtime.module';
import { MaintenanceModule } from '../maintenance/maintenance.module';
import { SparePartsModule } from '../spare-parts/spare-parts.module';

@Module({
  imports: [MachinesModule, TransfersModule, DowntimeModule, MaintenanceModule, SparePartsModule],
  controllers: [DashboardController],
})
export class DashboardModule {}
