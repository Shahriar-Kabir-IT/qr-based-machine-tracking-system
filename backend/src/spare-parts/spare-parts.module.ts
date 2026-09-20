import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SparePartRequest } from './entities/spare-part.entity';
import { SparePartCatalog } from './entities/spare-part-catalog.entity';
import { SparePartsService } from './spare-parts.service';
import { SparePartsController } from './spare-parts.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SparePartRequest, SparePartCatalog])],
  providers: [SparePartsService],
  controllers: [SparePartsController],
  exports: [SparePartsService],
})
export class SparePartsModule {}
