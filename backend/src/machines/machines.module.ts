import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Machine } from './entities/machine.entity';
import { MachinesService } from './machines.service';
import { MachinesController } from './machines.controller';
import { CacheService } from '../cache.service';

@Module({
  imports: [TypeOrmModule.forFeature([Machine])],
  providers: [MachinesService, CacheService],
  controllers: [MachinesController],
  exports: [MachinesService],
})
export class MachinesModule {}
