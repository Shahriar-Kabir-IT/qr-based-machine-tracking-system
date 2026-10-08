import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Machine } from '../../machines/entities/machine.entity';

export enum TransferBasis {
  LOAN = 'loan',
  PERMANENT = 'permanent',
  INTERNAL = 'internal',
}

export enum TransferStatus {
  REQUESTED = 'requested',
  FIRST_APPROVED = 'first_approved',
  SECOND_APPROVED = 'second_approved',
  DISPATCHED = 'dispatched',
  RECEIVED = 'received',
  CONDITION_CONFIRMED = 'condition_confirmed',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
  RETURN_REQUESTED = 'return_requested',
  RETURN_FIRST_APPROVED = 'return_first_approved',
  RETURN_SECOND_APPROVED = 'return_second_approved',
  RETURN_DISPATCHED = 'return_dispatched',
  RETURNED = 'returned',
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

  @Column({ nullable: true })
  fromSection: string;

  @Column({ nullable: true })
  fromLine: string;

  @Column()
  toFacility: string;

  @Column()
  toFloor: string;

  @Column({ nullable: true })
  toSection: string;

  @Column({ nullable: true })
  toLine: string;

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

  @Column({ nullable: true, unique: true })
  chalanNo: string;

  @Column({ nullable: true })
  dispatchedBy: number;

  @Column({ nullable: true })
  receivedBy: number;

  @Column({ nullable: true })
  receivedByName: string;

  @Column({ nullable: true })
  conditionConfirmedBy: number;

  @Column({ nullable: true })
  conditionConfirmedByName: string;

  @Column({ nullable: true })
  conditionNote: string;

  @Column({ type: 'timestamp', nullable: true })
  conditionConfirmedAt: Date;

  @Column({ nullable: true })
  dispatchedByName: string;

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

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ nullable: true })
  returnSecondApprovedBy: number;

  @Column({ type: 'timestamp', nullable: true })
  returnSecondApprovedAt: Date;

  @Column({ nullable: true, unique: true })
  returnChalanNo: string;

  @Column({ nullable: true })
  returnDispatchedBy: number;

  @Column({ nullable: true })
  returnDispatchedByName: string;

  @Column({ type: 'timestamp', nullable: true })
  returnDispatchedAt: Date;

  @Column({ nullable: true })
  returnReceivedBy: number;

  @Column({ nullable: true })
  returnReceivedByName: string;

  @Column({ type: 'timestamp', nullable: true })
  returnReceivedAt: Date;
}
