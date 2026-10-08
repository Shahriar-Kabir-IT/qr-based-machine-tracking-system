import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Machine } from '../../machines/entities/machine.entity';

export enum SparePartStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  STORE_ISSUED = 'store_issued',
  INSTALLED = 'installed',
}

@Entity('spare_part_requests')
export class SparePartRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  machineId: number;

  @ManyToOne(() => Machine)
  @JoinColumn({ name: 'machineId' })
  machine: Machine;

  @Column()
  machineType: string;

  @Column({ nullable: true })
  mfgSerialNo: string;

  @Column()
  part: string;

  @Column({ nullable: true, default: 'পিস' })
  unit: string;

  @Column({ default: 1 })
  qty: number;

  @Column({ nullable: true })
  reason: string;

  @Column({ nullable: true })
  facility: string;

  @Column({ nullable: true })
  floor: string;

  @Column({ nullable: true })
  line: string;

  @Column()
  requestedBy: string;

  @Column({ nullable: true })
  requestedByUserId: number;

  @Column({ type: 'enum', enum: SparePartStatus, default: SparePartStatus.PENDING })
  status: SparePartStatus;

  @Column({ nullable: true })
  approvedBy: number;

  @Column({ nullable: true })
  approverName: string;

  @Column({ nullable: true })
  rejectedBy: number;

  @Column({ nullable: true })
  rejectionReason: string;

  @Column({ nullable: true })
  issuedBy: number;

  @Column({ nullable: true })
  installedBy: number;

  @CreateDateColumn()
  requestedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  rejectedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  issuedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  installedAt: Date;
}
