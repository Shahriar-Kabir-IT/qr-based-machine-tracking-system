import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Machine } from '../../machines/entities/machine.entity';

export enum DowntimeStatus {
  REPORTED = 'reported',
  ACKNOWLEDGED = 'acknowledged',
  REPAIR_DONE = 'repair_done',
  SERVICE_COMPLETE = 'service_complete',
}

@Entity('downtime_records')
export class DowntimeRecord {
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
  line: string;

  @Column({ nullable: true })
  floor: string;

  @Column()
  reportedByUserId: number;

  @Column()
  reporterName: string;

  @Column()
  issueDescription: string;

  @Column({ type: 'enum', enum: DowntimeStatus, default: DowntimeStatus.REPORTED })
  status: DowntimeStatus;

  @Column({ nullable: true })
  mechanicUserId: number;

  @Column({ nullable: true })
  mechanicName: string;

  @Column({ type: 'timestamp', nullable: true })
  acknowledgedAt: Date;

  @Column({ nullable: true })
  repairNote: string;

  @Column({ nullable: true })
  sparePartsUsed: string;

  @Column({ type: 'timestamp', nullable: true })
  finishedAt: Date;

  @Column({ nullable: true })
  verifiedByUserId: number;

  @Column({ nullable: true })
  verificationNote: string;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt: Date;

  @Column({ nullable: true })
  repairDurationMinutes: number;

  @Column({ nullable: true })
  totalDowntimeMinutes: number;

  @CreateDateColumn()
  reportedAt: Date;
}
