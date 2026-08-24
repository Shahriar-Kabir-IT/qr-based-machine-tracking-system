import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum MachineStatus {
  PENDING_SUPER_ADMIN = 'pending_super_admin',
  PENDING_ADMIN = 'pending_admin',
  ACTIVE = 'active',
  REJECTED = 'rejected',
  UNDER_REPAIR = 'under_repair',
  IN_TRANSIT = 'in_transit',
  TRANSFERRED = 'transferred',
  ON_LOAN = 'on_loan',
}

@Entity('machines')
export class Machine {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, nullable: true })
  assetId: string;

  @Column()
  machineId: string;

  @Column({ default: 'SE' })
  section: string;

  @Column()
  machineType: string;

  @Column({ nullable: true })
  brand: string;

  @Column({ nullable: true })
  modelNo: string;

  @Column({ nullable: true })
  mfgSerialNo: string;

  @Column({ nullable: true })
  legacyMachineNo: string;

  @Column({ nullable: true })
  year: string;

  @Column()
  facility: string;

  @Column()
  floor: string;

  @Column({ nullable: true })
  line: string;

  @Column({ nullable: true })
  currentFacility: string;

  @Column({ nullable: true })
  currentFloor: string;

  @Column({ nullable: true })
  remarks: string;

  @Column({ type: 'enum', enum: MachineStatus, default: MachineStatus.PENDING_SUPER_ADMIN })
  status: MachineStatus;

  @Column({ nullable: true })
  submittedBy: number;

  @Column({ nullable: true })
  submitterName: string;

  @Column({ nullable: true })
  firstApprovedBy: number;

  @Column({ type: 'timestamp', nullable: true })
  firstApprovedAt: Date;

  @Column({ nullable: true })
  secondApprovedBy: number;

  @Column({ type: 'timestamp', nullable: true })
  secondApprovedAt: Date;

  @Column({ nullable: true })
  rejectedBy: number;

  @Column({ type: 'timestamp', nullable: true })
  rejectedAt: Date;

  @Column({ nullable: true })
  rejectionReason: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
