import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('spare_parts_catalog')
export class SparePartCatalog {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  partNo: string;

  @Column()
  description: string;

  @Index()
  @Column()
  machineType: string;
}
