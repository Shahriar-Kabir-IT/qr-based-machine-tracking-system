import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { MachinesModule } from '../machines/machines.module';
import { TransfersModule } from '../transfers/transfers.module';
import { DowntimeModule } from '../downtime/downtime.module';
import { MaintenanceModule } from '../maintenance/maintenance.module';
import { SparePartsModule } from '../spare-parts/spare-parts.module';
import { CacheService } from '../cache.service';

@Module({
  imports: [MachinesModule, TransfersModule, DowntimeModule, MaintenanceModule, SparePartsModule],
  controllers: [DashboardController],
  providers: [CacheService],
})
export class DashboardModule {}
