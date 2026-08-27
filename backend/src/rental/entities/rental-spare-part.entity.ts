import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { RentalRequest } from './rental.entity';

@Entity('rental_spare_parts')
export class RentalSparePart {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  rentalId: number;

  @ManyToOne(() => RentalRequest)
  @JoinColumn({ name: 'rentalId' })
  rental: RentalRequest;

  @Column()
  partName: string;

  @Column({ nullable: true })
  partNo: string;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ default: 'supplier' })
  providedBy: string;

  @Column({ default: false })
  removedBeforeReturn: boolean;

  @Column({ nullable: true })
  note: string;

  @Column({ nullable: true })
  addedBy: number;

  @Column({ nullable: true })
  addedByName: string;

  @CreateDateColumn()
  addedAt: Date;
}
