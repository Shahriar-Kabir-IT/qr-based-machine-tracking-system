import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import { RentalRequest, RentalStatus } from './entities/rental.entity';
import { RentalSparePart } from './entities/rental-spare-part.entity';
import { Machine } from '../machines/entities/machine.entity';

@Injectable()
export class RentalService {
  constructor(
    @InjectRepository(RentalRequest)
    private rentalRepo: Repository<RentalRequest>,
    @InjectRepository(RentalSparePart)
    private sparePartRepo: Repository<RentalSparePart>,
    @InjectRepository(Machine)
    private machineRepo: Repository<Machine>,
  ) {}

  async findAll(): Promise<RentalRequest[]> {
    return this.rentalRepo.find({ order: { requestedAt: 'DESC' } });
  }

  async findByFactory(factory: string): Promise<RentalRequest[]> {
    return this.rentalRepo.find({ where: { factory }, order: { requestedAt: 'DESC' } });
  }

  async findFiltered(factory?: string, floor?: string): Promise<RentalRequest[]> {
    const where: any = {};
    if (factory) where.factory = factory;
    if (floor) where.floor = floor;
    return this.rentalRepo.find({ where, order: { requestedAt: 'DESC' } });
  }

  async findActive(factory?: string, floor?: string): Promise<RentalRequest[]> {
    const where: any = { status: In([RentalStatus.RECEIVED, RentalStatus.CONDITION_CONFIRMED, RentalStatus.IN_USE]) };
    if (factory) where.factory = factory;
    if (floor) where.floor = floor;
    return this.rentalRepo.find({ where, order: { receivedAt: 'DESC' } });
  }

  async findForSecurity(facility?: string): Promise<RentalRequest[]> {
    const where: any = { status: In([RentalStatus.APPROVED, RentalStatus.RECEIVED, RentalStatus.CONDITION_CONFIRMED, RentalStatus.IN_USE, RentalStatus.RETURN_APPROVED]) };
    if (facility) where.factory = facility;
    return this.rentalRepo.find({ where, order: { requestedAt: 'DESC' } });
  }

  async findHistory(facility?: string): Promise<RentalRequest[]> {
    const where: any = { status: RentalStatus.RETURNED };
    if (facility) where.factory = facility;
    return this.rentalRepo.find({ where, order: { returnedAt: 'DESC' } });
  }

  async findOne(id: number): Promise<RentalRequest | null> {
    return this.rentalRepo.findOneBy({ id });
  }

  async create(data: Partial<RentalRequest>): Promise<RentalRequest> {
    const req = this.rentalRepo.create(data);
    return this.rentalRepo.save(req);
  }

  async approve(id: number, userId: number, userName: string, justification: string): Promise<RentalRequest> {
    const r = await this.findOne(id);
    if (!r || r.status !== RentalStatus.REQUESTED) throw new BadRequestException('Invalid status');
    r.status = RentalStatus.APPROVED;
    r.approvedBy = userId;
    r.approvedByName = userName;
    r.approvalJustification = justification;
    r.approvedAt = new Date();
    return this.rentalRepo.save(r);
  }

  async deny(id: number, userId: number, userName: string, justification: string): Promise<RentalRequest> {
    const r = await this.findOne(id);
    if (!r || r.status !== RentalStatus.REQUESTED) throw new BadRequestException('Invalid status');
    r.status = RentalStatus.DENIED;
    r.approvedBy = userId;
    r.approvedByName = userName;
    r.approvalJustification = justification;
    r.approvedAt = new Date();
    return this.rentalRepo.save(r);
  }

  async confirmReceipt(id: number, userId: number, userName: string): Promise<RentalRequest> {
    const r = await this.findOne(id);
    if (!r || r.status !== RentalStatus.APPROVED) throw new BadRequestException('Invalid status');
    r.status = RentalStatus.RECEIVED;
    r.receivedBySecurity = userId;
    r.receivedBySecurityName = userName;
    r.receivedAt = new Date();
    const docNo = `RCV-${String(r.id).padStart(5, '0')}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
    r.receivingDocNo = docNo;
    return this.rentalRepo.save(r);
  }

  async confirmCondition(id: number, userId: number, userName: string, note: string, userRole: string, userFacility?: string, userFloor?: string): Promise<RentalRequest> {
    const r = await this.findOne(id);
    if (!r || r.status !== RentalStatus.RECEIVED) throw new BadRequestException('Invalid status');
    if (userRole !== 'line_chief' && userRole !== 'mechanic') {
      throw new ForbiddenException('Only Line Chief or Mechanic can confirm condition');
    }
    if (userFacility && r.factory && r.factory.toLowerCase() !== userFacility.toLowerCase()) {
      throw new ForbiddenException('You can only confirm machines in your factory');
    }
    if (userFloor && r.floor && r.floor.toLowerCase() !== userFloor.toLowerCase()) {
      throw new ForbiddenException('You can only confirm machines on your floor');
    }
    r.status = RentalStatus.IN_USE;
    r.conditionConfirmedBy = userId;
    r.conditionConfirmedByName = userName;
    r.conditionNote = note;
    r.conditionConfirmedAt = new Date();
    return this.rentalRepo.save(r);
  }

  async notifyReturn(id: number, userId: number, userName: string): Promise<RentalRequest> {
    const r = await this.findOne(id);
    if (!r || r.status !== RentalStatus.IN_USE) throw new BadRequestException('Invalid status');
    r.returnNotifiedBy = userId;
    r.returnNotifiedByName = userName;
    r.returnNotifiedAt = new Date();
    return this.rentalRepo.save(r);
  }

  async requestReturn(id: number, userId: number, userName: string): Promise<RentalRequest> {
    const r = await this.findOne(id);
    if (!r || r.status !== RentalStatus.IN_USE) throw new BadRequestException('Invalid status');
    r.status = RentalStatus.RETURN_REQUESTED;
    r.returnRequestedBy = userId;
    r.returnRequestedByName = userName;
    r.returnRequestedAt = new Date();
    return this.rentalRepo.save(r);
  }

  async approveReturn(id: number, userId: number, userName: string): Promise<RentalRequest> {
    const r = await this.findOne(id);
    if (!r || r.status !== RentalStatus.RETURN_REQUESTED) throw new BadRequestException('Invalid status');
    r.status = RentalStatus.RETURN_APPROVED;
    r.returnApprovedBy = userId;
    r.returnApprovedByName = userName;
    r.returnApprovedAt = new Date();
    return this.rentalRepo.save(r);
  }

  async confirmReturn(id: number, userId: number, userName: string): Promise<RentalRequest> {
    const r = await this.findOne(id);
    if (!r || r.status !== RentalStatus.RETURN_APPROVED) throw new BadRequestException('Invalid status');
    r.status = RentalStatus.RETURNED;
    r.returnConfirmedBy = userId;
    r.returnConfirmedByName = userName;
    r.returnedAt = new Date();
    const docNo = `OUT-${String(r.id).padStart(5, '0')}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
    r.outingDocNo = docNo;
    return this.rentalRepo.save(r);
  }

  async addSparePart(data: Partial<RentalSparePart>): Promise<RentalSparePart> {
    const part = this.sparePartRepo.create(data);
    return this.sparePartRepo.save(part);
  }

  async getSparePartsByRental(rentalId: number): Promise<RentalSparePart[]> {
    return this.sparePartRepo.find({ where: { rentalId }, order: { addedAt: 'DESC' } });
  }

  async updateSparePart(id: number, data: Partial<RentalSparePart>): Promise<RentalSparePart> {
    const part = await this.sparePartRepo.findOneBy({ id });
    if (!part) throw new BadRequestException('Part not found');
    Object.assign(part, data);
    return this.sparePartRepo.save(part);
  }

  async deleteSparePart(id: number): Promise<void> {
    await this.sparePartRepo.delete(id);
  }

  async getSuggestions(facility?: string): Promise<{ machineTypes: string[]; floors: string[]; sections: string[]; lines: string[] }> {
    const where: any = {};
    if (facility) where.facility = facility;
    const machines = await this.machineRepo.find({ where, select: { machineType: true, floor: true, section: true, line: true } });
    const unique = (arr: string[]) => [...new Set(arr.filter(Boolean))].sort();
    return {
      machineTypes: unique(machines.map((m) => m.machineType)),
      floors: unique(machines.map((m) => m.floor)),
      sections: unique(machines.map((m) => m.section)),
      lines: unique(machines.map((m) => m.line)),
    };
  }
}
