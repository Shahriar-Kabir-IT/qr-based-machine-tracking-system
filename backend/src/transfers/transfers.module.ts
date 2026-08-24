import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transfer } from './entities/transfer.entity';
import { TransfersService } from './transfers.service';
import { TransfersController } from './transfers.controller';
import { MachinesModule } from '../machines/machines.module';

@Module({
  imports: [TypeOrmModule.forFeature([Transfer]), MachinesModule],
  providers: [TransfersService],
  controllers: [TransfersController],
  exports: [TransfersService],
})
export class TransfersModule {}
