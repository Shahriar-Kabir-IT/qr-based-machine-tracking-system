import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Machine } from '../../machines/entities/machine.entity';

export enum MaintenanceCategory {
  PREVENTIVE = 'preventive',
  PERIODICAL = 'periodical',
  DAILY = 'daily',
}

export enum MaintenanceStatus {
  COMPLETE = 'complete',
  INCOMPLETE = 'incomplete',
}

@Entity('maintenance_logs')
export class MaintenanceLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  machineId: number;

  @ManyToOne(() => Machine)
  @JoinColumn({ name: 'machineId' })
  machine: Machine;

  @Column()
  machineType: string;

  @Column({ type: 'enum', enum: MaintenanceCategory })
  category: MaintenanceCategory;

  @Column({ type: 'simple-array' })
  activities: string[];

  @Column()
  performedBy: string;

  @Column({ type: 'enum', enum: MaintenanceStatus, default: MaintenanceStatus.COMPLETE })
  status: MaintenanceStatus;

  @CreateDateColumn()
  performedAt: Date;
}
