import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RentalRequest } from './entities/rental.entity';
import { RentalSparePart } from './entities/rental-spare-part.entity';
import { Machine } from '../machines/entities/machine.entity';
import { RentalService } from './rental.service';
import { RentalController } from './rental.controller';

@Module({
  imports: [TypeOrmModule.forFeature([RentalRequest, RentalSparePart, Machine])],
  providers: [RentalService],
  controllers: [RentalController],
  exports: [RentalService],
})
export class RentalModule {}
