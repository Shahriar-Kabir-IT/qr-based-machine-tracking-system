import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DowntimeRecord } from './entities/downtime.entity';
import { DowntimeService } from './downtime.service';
import { DowntimeController } from './downtime.controller';
import { MachinesModule } from '../machines/machines.module';

@Module({
  imports: [TypeOrmModule.forFeature([DowntimeRecord]), MachinesModule],
  providers: [DowntimeService],
  controllers: [DowntimeController],
  exports: [DowntimeService],
})
export class DowntimeModule {}
