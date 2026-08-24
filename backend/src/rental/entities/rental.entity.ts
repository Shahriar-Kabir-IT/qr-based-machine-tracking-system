import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum RentalStatus {
  REQUESTED = 'requested',
  APPROVED = 'approved',
  DENIED = 'denied',
  RECEIVED = 'received',
  CONDITION_CONFIRMED = 'condition_confirmed',
  IN_USE = 'in_use',
  RETURN_REQUESTED = 'return_requested',
  RETURN_APPROVED = 'return_approved',
  RETURNED = 'returned',
}

@Entity('rental_requests')
export class RentalRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  machineType: string;

  @Column({ nullable: true })
  model: string;

  @Column()
  justification: string;

  @Column({ nullable: true })
  supplier: string;

  @Column({ type: 'enum', enum: RentalStatus, default: RentalStatus.REQUESTED })
  status: RentalStatus;

  @Column()
  requestedBy: number;

  @Column({ nullable: true })
  approvedBy: number;

  @Column({ nullable: true })
  approvalJustification: string;

  @Column({ nullable: true })
  receivedByAdmin: number;

  @Column({ nullable: true })
  receivedBySecurity: number;

  @Column({ nullable: true })
  conditionConfirmedBy: number;

  @Column({ nullable: true })
  returnRequestedBy: number;

  @Column({ nullable: true })
  returnApprovedBy: number;

  @Column({ nullable: true })
  returnConfirmedBy: number;

  @Column({ nullable: true })
  partsReplaced: string;

  @CreateDateColumn()
  requestedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  receivedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  conditionConfirmedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  returnRequestedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  returnApprovedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  returnedAt: Date;
}
