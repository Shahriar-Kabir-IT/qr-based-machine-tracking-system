import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RentalRequest } from './entities/rental.entity';
import { RentalService } from './rental.service';
import { RentalController } from './rental.controller';

@Module({
  imports: [TypeOrmModule.forFeature([RentalRequest])],
  providers: [RentalService],
  controllers: [RentalController],
  exports: [RentalService],
})
export class RentalModule {}
