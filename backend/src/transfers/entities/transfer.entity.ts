import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Machine } from '../../machines/entities/machine.entity';

export enum TransferBasis {
  LOAN = 'loan',
  PERMANENT = 'permanent',
}

export enum TransferStatus {
  REQUESTED = 'requested',
  FIRST_APPROVED = 'first_approved',
  SECOND_APPROVED = 'second_approved',
  DISPATCHED = 'dispatched',
  RECEIVED = 'received',
  REJECTED = 'rejected',
  RETURN_REQUESTED = 'return_requested',
  RETURN_APPROVED = 'return_approved',
}

@Entity('transfers')
export class Transfer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  machineId: number;

  @ManyToOne(() => Machine)
  @JoinColumn({ name: 'machineId' })
  machine: Machine;

  @Column()
  fromFacility: string;

  @Column()
  fromFloor: string;

  @Column()
  toFacility: string;

  @Column()
  toFloor: string;

  @Column({ nullable: true })
  direction: string;

  @Column()
  reason: string;

  @Column({ type: 'enum', enum: TransferBasis })
  basis: TransferBasis;

  @Column({ type: 'enum', enum: TransferStatus, default: TransferStatus.REQUESTED })
  status: TransferStatus;

  @Column()
  requestedBy: number;

  @Column({ nullable: true })
  firstApprovedBy: number;

  @Column({ nullable: true })
  secondApprovedBy: number;

  @Column({ nullable: true })
  dispatchedBy: number;

  @Column({ nullable: true })
  receivedBy: number;

  @Column({ nullable: true })
  rejectedBy: number;

  @Column({ nullable: true })
  rejectionReason: string;

  @Column({ type: 'date', nullable: true })
  expectedReturnDate: string;

  @Column({ nullable: true })
  returnRequestedBy: number;

  @Column({ type: 'timestamp', nullable: true })
  returnRequestedAt: Date;

  @Column({ nullable: true })
  returnApprovedBy: number;

  @Column({ type: 'timestamp', nullable: true })
  returnApprovedAt: Date;

  @CreateDateColumn()
  requestedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  firstApprovedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  secondApprovedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  dispatchedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  receivedAt: Date;
}
