import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { SparePartRequest, SparePartStatus } from './entities/spare-part.entity';

@Injectable()
export class SparePartsService {
  constructor(
    @InjectRepository(SparePartRequest)
    private sparePartsRepo: Repository<SparePartRequest>,
  ) {}

  async findAll(): Promise<SparePartRequest[]> {
    return this.sparePartsRepo.find({ relations: { machine: true }, order: { requestedAt: 'DESC' } });
  }

  async findOne(id: number): Promise<SparePartRequest | null> {
    return this.sparePartsRepo.findOne({ where: { id }, relations: { machine: true } });
  }

  async create(data: Partial<SparePartRequest>): Promise<SparePartRequest> {
    const req = this.sparePartsRepo.create({ ...data, status: SparePartStatus.PENDING });
    return this.sparePartsRepo.save(req);
  }

  async approve(id: number, userId: number): Promise<SparePartRequest> {
    const r = await this.findOne(id);
    if (!r || r.status !== SparePartStatus.PENDING) throw new BadRequestException('Not in Pending status');
    r.status = SparePartStatus.APPROVED;
    r.approvedBy = userId;
    r.approvedAt = new Date();
    return this.sparePartsRepo.save(r);
  }

  async storeIssue(id: number, userId: number): Promise<SparePartRequest> {
    const r = await this.findOne(id);
    if (!r || r.status !== SparePartStatus.APPROVED) throw new BadRequestException('Not in Approved status');
    r.status = SparePartStatus.STORE_ISSUED;
    r.issuedBy = userId;
    r.issuedAt = new Date();
    return this.sparePartsRepo.save(r);
  }

  async install(id: number, userId: number): Promise<SparePartRequest> {
    const r = await this.findOne(id);
    if (!r || r.status !== SparePartStatus.STORE_ISSUED) throw new BadRequestException('Not in Store Issued status');
    r.status = SparePartStatus.INSTALLED;
    r.installedBy = userId;
    r.installedAt = new Date();
    return this.sparePartsRepo.save(r);
  }

  async countNotInstalled(): Promise<number> {
    return this.sparePartsRepo.count({ where: { status: Not(SparePartStatus.INSTALLED) } });
  }
}
