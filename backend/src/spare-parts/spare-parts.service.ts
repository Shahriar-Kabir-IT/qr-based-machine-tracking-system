import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, ILike } from 'typeorm';
import { SparePartRequest, SparePartStatus } from './entities/spare-part.entity';
import { SparePartCatalog } from './entities/spare-part-catalog.entity';

@Injectable()
export class SparePartsService {
  constructor(
    @InjectRepository(SparePartRequest)
    private sparePartsRepo: Repository<SparePartRequest>,
    @InjectRepository(SparePartCatalog)
    private catalogRepo: Repository<SparePartCatalog>,
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

  async searchCatalog(query?: string, machineType?: string): Promise<SparePartCatalog[]> {
    const where: any = {};
    if (machineType) where.machineType = machineType;
    if (query) {
      where.description = ILike(`%${query}%`);
    }
    return this.catalogRepo.find({ where, order: { description: 'ASC' }, take: 50 });
  }

  async getCatalogAll(machineType?: string, search?: string, page = 1, limit = 50) {
    const qb = this.catalogRepo.createQueryBuilder('c');
    if (machineType) qb.andWhere('c.machineType = :machineType', { machineType });
    if (search) qb.andWhere('(c.description ILIKE :s OR c.partNo ILIKE :s)', { s: `%${search}%` });
    qb.orderBy('c.machineType').addOrderBy('c.description');
    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return { data, total, page, limit };
  }

  async getCatalogMachineTypes(): Promise<string[]> {
    const result = await this.catalogRepo.createQueryBuilder('c')
      .select('DISTINCT c.machineType', 'machineType')
      .orderBy('c.machineType')
      .getRawMany();
    return result.map(r => r.machineType);
  }

  async getAnalytics() {
    const statusCounts = await this.sparePartsRepo.createQueryBuilder('r')
      .select('r.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(r.qty)', 'totalQty')
      .groupBy('r.status')
      .getRawMany();

    const topParts = await this.sparePartsRepo.createQueryBuilder('r')
      .select('r.part', 'part')
      .addSelect('COUNT(*)', 'requestCount')
      .addSelect('SUM(r.qty)', 'totalQty')
      .groupBy('r.part')
      .orderBy('COUNT(*)', 'DESC')
      .limit(20)
      .getRawMany();

    const topMachines = await this.sparePartsRepo.createQueryBuilder('r')
      .select('r.machineType', 'machineType')
      .addSelect('COUNT(*)', 'requestCount')
      .addSelect('SUM(r.qty)', 'totalQty')
      .groupBy('r.machineType')
      .orderBy('COUNT(*)', 'DESC')
      .limit(15)
      .getRawMany();

    const byMechanic = await this.sparePartsRepo.createQueryBuilder('r')
      .select('r.requestedBy', 'mechanic')
      .addSelect('COUNT(*)', 'requestCount')
      .addSelect('SUM(r.qty)', 'totalQty')
      .groupBy('r.requestedBy')
      .orderBy('COUNT(*)', 'DESC')
      .limit(15)
      .getRawMany();

    const monthlyTrend = await this.sparePartsRepo.createQueryBuilder('r')
      .select("TO_CHAR(r.requestedAt, 'YYYY-MM')", 'month')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(r.qty)', 'totalQty')
      .groupBy("TO_CHAR(r.requestedAt, 'YYYY-MM')")
      .orderBy("TO_CHAR(r.requestedAt, 'YYYY-MM')")
      .getRawMany();

    const catalogStats = await this.catalogRepo.createQueryBuilder('c')
      .select('c.machineType', 'machineType')
      .addSelect('COUNT(*)', 'partsCount')
      .groupBy('c.machineType')
      .orderBy('COUNT(*)', 'DESC')
      .getRawMany();

    const totalCatalog = await this.catalogRepo.count();

    return { statusCounts, topParts, topMachines, byMechanic, monthlyTrend, catalogStats, totalCatalog };
  }
}
