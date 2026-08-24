import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  entityType: string;

  @Column()
  entityId: number;

  @Column()
  action: string;

  @Column()
  actorId: number;

  @Column({ nullable: true })
  actorName: string;

  @Column({ type: 'jsonb', nullable: true })
  previousValue: any;

  @Column({ type: 'jsonb', nullable: true })
  newValue: any;

  @CreateDateColumn()
  timestamp: Date;
}
