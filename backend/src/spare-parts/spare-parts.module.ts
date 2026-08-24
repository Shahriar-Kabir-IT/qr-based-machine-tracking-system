import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SparePartRequest } from './entities/spare-part.entity';
import { SparePartsService } from './spare-parts.service';
import { SparePartsController } from './spare-parts.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SparePartRequest])],
  providers: [SparePartsService],
  controllers: [SparePartsController],
  exports: [SparePartsService],
})
export class SparePartsModule {}
