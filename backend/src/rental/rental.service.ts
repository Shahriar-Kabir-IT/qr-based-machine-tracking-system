import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RentalRequest, RentalStatus } from './entities/rental.entity';

@Injectable()
export class RentalService {
  constructor(
    @InjectRepository(RentalRequest)
    private rentalRepo: Repository<RentalRequest>,
  ) {}

  async findAll(): Promise<RentalRequest[]> {
    return this.rentalRepo.find({ order: { requestedAt: 'DESC' } });
  }

  async findOne(id: number): Promise<RentalRequest | null> {
    return this.rentalRepo.findOneBy({ id });
  }

  async create(data: Partial<RentalRequest>): Promise<RentalRequest> {
    const req = this.rentalRepo.create(data);
    return this.rentalRepo.save(req);
  }

  async approve(id: number, userId: number, justification: string): Promise<RentalRequest> {
    const r = await this.findOne(id);
    if (!r || r.status !== RentalStatus.REQUESTED) throw new BadRequestException('Invalid status');
    r.status = RentalStatus.APPROVED;
    r.approvedBy = userId;
    r.approvalJustification = justification;
    r.approvedAt = new Date();
    return this.rentalRepo.save(r);
  }

  async deny(id: number, userId: number, justification: string): Promise<RentalRequest> {
    const r = await this.findOne(id);
    if (!r || r.status !== RentalStatus.REQUESTED) throw new BadRequestException('Invalid status');
    r.status = RentalStatus.DENIED;
    r.approvedBy = userId;
    r.approvalJustification = justification;
    r.approvedAt = new Date();
    return this.rentalRepo.save(r);
  }

  async confirmReceipt(id: number, userId: number, role: 'admin' | 'security'): Promise<RentalRequest> {
    const r = await this.findOne(id);
    if (!r || r.status !== RentalStatus.APPROVED) throw new BadRequestException('Invalid status');
    if (role === 'admin') r.receivedByAdmin = userId;
    else r.receivedBySecurity = userId;
    if (r.receivedByAdmin && r.receivedBySecurity) {
      r.status = RentalStatus.RECEIVED;
      r.receivedAt = new Date();
    }
    return this.rentalRepo.save(r);
  }

  async confirmCondition(id: number, userId: number): Promise<RentalRequest> {
    const r = await this.findOne(id);
    if (!r || r.status !== RentalStatus.RECEIVED) throw new BadRequestException('Invalid status');
    r.status = RentalStatus.IN_USE;
    r.conditionConfirmedBy = userId;
    r.conditionConfirmedAt = new Date();
    return this.rentalRepo.save(r);
  }

  async requestReturn(id: number, userId: number): Promise<RentalRequest> {
    const r = await this.findOne(id);
    if (!r || r.status !== RentalStatus.IN_USE) throw new BadRequestException('Invalid status');
    r.status = RentalStatus.RETURN_REQUESTED;
    r.returnRequestedBy = userId;
    r.returnRequestedAt = new Date();
    return this.rentalRepo.save(r);
  }

  async approveReturn(id: number, userId: number): Promise<RentalRequest> {
    const r = await this.findOne(id);
    if (!r || r.status !== RentalStatus.RETURN_REQUESTED) throw new BadRequestException('Invalid status');
    r.status = RentalStatus.RETURN_APPROVED;
    r.returnApprovedBy = userId;
    r.returnApprovedAt = new Date();
    return this.rentalRepo.save(r);
  }

  async confirmReturn(id: number, userId: number): Promise<RentalRequest> {
    const r = await this.findOne(id);
    if (!r || r.status !== RentalStatus.RETURN_APPROVED) throw new BadRequestException('Invalid status');
    r.status = RentalStatus.RETURNED;
    r.returnConfirmedBy = userId;
    r.returnedAt = new Date();
    return this.rentalRepo.save(r);
  }
}
