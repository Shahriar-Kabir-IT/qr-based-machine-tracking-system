import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Machine, MachineStatus } from './entities/machine.entity';

@Injectable()
export class MachinesService {
  constructor(
    @InjectRepository(Machine)
    private machinesRepo: Repository<Machine>,
  ) {}

  async findAll(query: { search?: string; floor?: string; machineType?: string; status?: string; facility?: string }) {
    let qb = this.machinesRepo.createQueryBuilder('m');

    if (query.facility) qb = qb.andWhere('(m.currentFacility = :fac OR m.facility = :fac)', { fac: query.facility });
    if (query.floor) qb = qb.andWhere('m.floor = :floor', { floor: query.floor });
    if (query.machineType) qb = qb.andWhere('m.machineType = :machineType', { machineType: query.machineType });
    if (query.status) qb = qb.andWhere('m.status = :status', { status: query.status });
    if (query.search) {
      qb = qb.andWhere(
        '(m.assetId ILIKE :s OR m.brand ILIKE :s OR m.mfgSerialNo ILIKE :s OR m.legacyMachineNo ILIKE :s OR m.machineId ILIKE :s)',
        { s: `%${query.search}%` },
      );
    }

    return qb.orderBy('m.machineId', 'ASC').addOrderBy('m.createdAt', 'ASC').getMany();
  }

  async findOne(id: number): Promise<Machine | null> {
    return this.machinesRepo.findOneBy({ id });
  }

  async findByAssetId(assetId: string): Promise<Machine | null> {
    return this.machinesRepo.findOneBy({ assetId });
  }

  async findBySubmitter(userId: number): Promise<Machine[]> {
    return this.machinesRepo.find({
      where: { submittedBy: userId },
      order: { createdAt: 'DESC' },
    });
  }

  async create(data: Partial<Machine>): Promise<Machine> {
    const machine = this.machinesRepo.create({
      ...data,
      status: MachineStatus.PENDING_SUPER_ADMIN,
      currentFacility: data.facility,
      currentFloor: data.floor,
    });
    return this.machinesRepo.save(machine);
  }

  async firstApprove(id: number, approvedBy: number): Promise<Machine> {
    const machine = await this.findOne(id);
    if (!machine) throw new BadRequestException('Machine not found');
    if (machine.status !== MachineStatus.PENDING_SUPER_ADMIN) {
      throw new BadRequestException('Machine is not pending super admin approval');
    }
    const assetId = await this.generateAssetId(machine.section || 'SE', machine.facility);
    machine.assetId = assetId;
    machine.status = MachineStatus.PENDING_ADMIN;
    machine.firstApprovedBy = approvedBy;
    machine.firstApprovedAt = new Date();
    return this.machinesRepo.save(machine);
  }

  async secondApprove(id: number, approvedBy: number): Promise<Machine> {
    const machine = await this.findOne(id);
    if (!machine) throw new BadRequestException('Machine not found');
    if (machine.status !== MachineStatus.PENDING_ADMIN) {
      throw new BadRequestException('Machine is not pending admin approval');
    }
    machine.status = MachineStatus.ACTIVE;
    machine.secondApprovedBy = approvedBy;
    machine.secondApprovedAt = new Date();
    return this.machinesRepo.save(machine);
  }

  async reject(id: number, rejectedBy: number, reason: string): Promise<Machine> {
    const machine = await this.findOne(id);
    if (!machine) throw new BadRequestException('Machine not found');
    if (![MachineStatus.PENDING_SUPER_ADMIN, MachineStatus.PENDING_ADMIN].includes(machine.status)) {
      throw new BadRequestException('Machine is not in a pending state');
    }
    machine.status = MachineStatus.REJECTED;
    machine.rejectedBy = rejectedBy;
    machine.rejectedAt = new Date();
    machine.rejectionReason = reason;
    return this.machinesRepo.save(machine);
  }

  async updateStatus(id: number, status: MachineStatus): Promise<void> {
    await this.machinesRepo.update(id, { status });
  }

  async updateStatusAndLocation(id: number, status: MachineStatus, facility: string, floor: string): Promise<void> {
    await this.machinesRepo.update(id, { status, currentFacility: facility, currentFloor: floor });
  }

  async count(): Promise<number> {
    return this.machinesRepo.count({ where: { status: MachineStatus.ACTIVE } });
  }

  async countByFloor(): Promise<{ facility: string; floor: string; count: number }[]> {
    const raw = await this.machinesRepo
      .createQueryBuilder('m')
      .select('m.currentFacility', 'facility')
      .addSelect('m.currentFloor', 'floor')
      .addSelect('COUNT(*)', 'count')
      .where('m.status = :status', { status: MachineStatus.ACTIVE })
      .groupBy('m.currentFacility')
      .addGroupBy('m.currentFloor')
      .getRawMany();

    const floorNorm: Record<string, string> = { 'CUTING': 'CUTTING' };
    const merged = new Map<string, { facility: string; floor: string; count: number }>();
    for (const r of raw) {
      const floor = floorNorm[r.floor?.trim()] || r.floor?.trim() || 'UNASSIGNED';
      const key = `${r.facility}-${floor}`;
      const existing = merged.get(key);
      if (existing) {
        existing.count += parseInt(r.count, 10);
      } else {
        merged.set(key, { facility: r.facility, floor, count: parseInt(r.count, 10) });
      }
    }

    const floorOrder = ['1ST', '2ND', '3RD', '4TH', '5TH', '6TH', '7TH', '8TH'];
    return Array.from(merged.values()).sort((a, b) => {
      if (a.facility !== b.facility) return a.facility.localeCompare(b.facility);
      const ai = floorOrder.indexOf(a.floor);
      const bi = floorOrder.indexOf(b.floor);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.floor.localeCompare(b.floor);
    });
  }

  async countByType(): Promise<{ machineType: string; count: number }[]> {
    return this.machinesRepo
      .createQueryBuilder('m')
      .select('m.machineType', 'machineType')
      .addSelect('COUNT(*)', 'count')
      .where('m.status = :status', { status: MachineStatus.ACTIVE })
      .groupBy('m.machineType')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();
  }

  async seed() {
    const count = await this.machinesRepo.count();
    if (count > 0) return;

    const realMachines: Partial<Machine>[] = [
      { machineId: 'AGL-SNLS-00001', section: 'SE', machineType: 'SNLS', brand: 'JUKI', modelNo: 'DDL-8300N', mfgSerialNo: '4D0YG24416', year: '2005', facility: 'AGL', floor: '7TH', line: 'SAMPLE', remarks: 'SAMPLE (7TH FLOOR)' },
      { machineId: 'AGL-SNLS-00002', section: 'SE', machineType: 'SNLS', brand: 'JUKI', modelNo: 'DDL-8300N', mfgSerialNo: '4D0YA13744', year: '2005', facility: 'AGL', floor: '4TH', remarks: '4TH FLOOR (IDLE)' },
      { machineId: 'AGL-SNLS-00003', section: 'SE', machineType: 'SNLS', brand: 'JUKI', modelNo: 'DDL-8300N', mfgSerialNo: '4D0YZ21467', year: '2005', facility: 'AGL', floor: '4TH', remarks: '4TH FLOOR (MACHINE STORE)' },
      { machineId: 'AGL-SNLS-00004', section: 'SE', machineType: 'SNLS', brand: 'JUKI', modelNo: 'DDL-8300N', mfgSerialNo: '4DOYL05683', year: '2005', facility: 'AGL', floor: '4TH', remarks: '4TH FLOOR (MACHINE STORE)' },
      { machineId: 'AGL-SNLS-00005', section: 'SE', machineType: 'SNLS', brand: 'JUKI', modelNo: 'DDL-8300N', mfgSerialNo: '4D0YG24476', year: '2005', facility: 'AGL', floor: '4TH', remarks: '4TH FLOOR (MACHINE STORE)' },
      { machineId: 'AGL-SNLS-00006', section: 'SE', machineType: 'SNLS', brand: 'JUKI', modelNo: 'DDL-8300N', mfgSerialNo: '4DON005589', year: '2005', facility: 'AGL', floor: '4TH', remarks: '4TH FLOOR (MACHINE STORE)' },
      { machineId: 'AGL-SNLS-00007', section: 'SE', machineType: 'SNLS', brand: 'JUKI', modelNo: 'DDL-8300N', year: '2005', facility: 'AGL', floor: '4TH', remarks: '4TH FLOOR (MACHINE STORE)' },
      { machineId: 'AGL-SNLS-00008', section: 'SE', machineType: 'SNLS', brand: 'JUKI', modelNo: 'DDL-8300N', year: '2005', facility: 'AGL', floor: '5TH', remarks: '5TH FLOOR (N)' },
      { machineId: 'AGL-SNLS-00009', section: 'SE', machineType: 'SNLS', brand: 'JUKI', modelNo: 'DDL-8700-7', mfgSerialNo: '2D0ZM15588', year: '2006', facility: 'AGL', floor: '8TH', line: 'SAMPLE', remarks: 'SAMPLE (8TH FLOOR)' },
      { machineId: 'AGL-SNLS-00010', section: 'SE', machineType: 'SNLS', brand: 'JUKI', modelNo: 'DDL-8700-7', mfgSerialNo: '2D0ZM01385', year: '2006', facility: 'AGL', floor: '8TH', line: 'SAMPLE', remarks: 'SAMPLE (8TH FLOOR)' },
      { machineId: 'AGL-SNLS-00011', section: 'SE', machineType: 'SNLS', brand: 'JUKI', modelNo: 'DDL-8700-7', mfgSerialNo: '2D0ZM01423', year: '2006', facility: 'AGL', floor: '8TH', line: 'SAMPLE', remarks: 'SAMPLE (8TH FLOOR)' },
      { machineId: 'AGL-SNLS-00012', section: 'SE', machineType: 'SNLS', brand: 'JUKI', modelNo: 'DDL-8700-7', mfgSerialNo: '2D0YE01991', year: '2006', facility: 'AGL', floor: '8TH', line: 'SAMPLE', remarks: 'SAMPLE (8TH FLOOR)' },
      { machineId: 'AGL-SNLS-00013', section: 'SE', machineType: 'SNLS', brand: 'JUKI', modelNo: 'DDL-8700-7', mfgSerialNo: '2D0ZM01365', year: '2006', facility: 'AGL', floor: '8TH', line: 'SAMPLE', remarks: 'SAMPLE (8TH FLOOR)' },
      { machineId: 'AGL-SNLS-00014', section: 'SE', machineType: 'SNLS', brand: 'JUKI', modelNo: 'DDL-8700-7', mfgSerialNo: '2D02M01699', year: '2006', facility: 'AGL', floor: '8TH', line: 'SAMPLE', remarks: 'SAMPLE (8TH FLOOR)' },
      { machineId: 'AGL-SNLS-00015', section: 'SE', machineType: 'SNLS', brand: 'JUKI', modelNo: 'DDL-8700-7', mfgSerialNo: '2D02M01514', year: '2006', facility: 'AGL', floor: '8TH', line: 'SAMPLE', remarks: 'SAMPLE (8TH FLOOR)' },
      { machineId: 'AGL-SNLS-00016', section: 'SE', machineType: 'SNLS', brand: 'JUKI', modelNo: 'DDL-8700-7', mfgSerialNo: '2D02M01592', year: '2006', facility: 'AGL', floor: '8TH', line: 'SAMPLE', remarks: 'SAMPLE (8TH FLOOR)' },
      { machineId: 'AGL-SNLS-00017', section: 'SE', machineType: 'SNLS', brand: 'JUKI', modelNo: 'DDL-8700-7', mfgSerialNo: '2D02M01612', year: '2006', facility: 'AGL', floor: '8TH', line: 'SAMPLE', remarks: 'SAMPLE (8TH FLOOR)' },
      { machineId: 'AGL-SNLS-00018', section: 'SE', machineType: 'SNLS', brand: 'JUKI', modelNo: 'DDL-8700-7', mfgSerialNo: '4D0YG24484', year: '2006', facility: 'AGL', floor: '8TH', line: 'SAMPLE', remarks: 'SAMPLE (8TH FLOOR)' },
      { machineId: 'AGL-DNLS-00001', section: 'SE', machineType: 'DNLS', brand: 'JUKI', modelNo: 'LH-3128', mfgSerialNo: '3L3ZA03989', year: '2012', facility: 'AGL', floor: '3RD', remarks: '3RD FLOOR (IDLE)' },
      { machineId: 'AGL-DNLS-00002', section: 'SE', machineType: 'DNLS', brand: 'JUKI', modelNo: 'LH-3128', mfgSerialNo: '3L3YH05179', year: '2012', facility: 'AGL', floor: '3RD', remarks: '3RD FLOOR (IDLE)' },
      { machineId: 'AGL-DNLS-00003', section: 'SE', machineType: 'DNLS', brand: 'JUKI', modelNo: 'LH-3128', mfgSerialNo: '3L3YL07391', year: '2012', facility: 'AGL', floor: '3RD', remarks: '3RD FLOOR (IDLE)' },
      { machineId: 'AGL-DNLS-00004', section: 'SE', machineType: 'DNLS', brand: 'JUKI', modelNo: 'LH-3128', mfgSerialNo: '3L37A03930', year: '2012', facility: 'AGL', floor: '4TH', line: 'NEW-01', remarks: '4TH FLOOR (NEW-01)' },
      { machineId: 'AGL-DNLS-00005', section: 'SE', machineType: 'DNLS', brand: 'JUKI', modelNo: 'LH-3128', mfgSerialNo: '3L3YH05151', year: '2012', facility: 'AGL', floor: '4TH', remarks: '4TH FLOOR (IDLE)' },
      { machineId: 'AGL-DNLS-00006', section: 'SE', machineType: 'DNLS', brand: 'JUKI', modelNo: 'LH-3128', mfgSerialNo: '3L3YH0519', year: '2012', facility: 'AGL', floor: '4TH', remarks: '4TH FLOOR (MACHINE STORE)' },
      { machineId: 'AGL-DNLS-00007', section: 'SE', machineType: 'DNLS', brand: 'JUKI', modelNo: 'LH-3128', mfgSerialNo: '3L3YL07396', year: '2012', facility: 'AGL', floor: '4TH', remarks: '4TH FLOOR (MACHINE STORE)' },
      { machineId: 'AGL-DNLS-00008', section: 'SE', machineType: 'DNLS', brand: 'JUKI', modelNo: 'LH-3128', mfgSerialNo: '3L3YF03233', year: '2012', facility: 'AGL', floor: '4TH', remarks: '4TH FLOOR (MACHINE STORE)' },
      { machineId: 'AGL-DNLS-00009', section: 'SE', machineType: 'DNLS', brand: 'JUKI', modelNo: 'LH-3128', mfgSerialNo: '3L3YH05134', year: '2012', facility: 'AGL', floor: '4TH', remarks: '4TH FLOOR (MACHINE STORE)' },
      { machineId: 'AGL-DNLS-00010', section: 'SE', machineType: 'DNLS', brand: 'JUKI', modelNo: 'LH-3128', mfgSerialNo: '3L3YM02225', year: '2012', facility: 'AGL', floor: '4TH', remarks: '4TH FLOOR (MACHINE STORE)' },
      { machineId: 'AGL-DNLS-00011', section: 'SE', machineType: 'DNLS', brand: 'JUKI', modelNo: 'LH-3528 S', mfgSerialNo: '3L3BO00218', year: '2015', facility: 'AGL', floor: '3RD', line: 'B', remarks: '3RD FLOOR (B)' },
      { machineId: 'AGL-DNLS-00012', section: 'SE', machineType: 'DNLS', brand: 'JUKI', modelNo: 'LH-3528 S', mfgSerialNo: '3L3BAH00189', year: '2015', facility: 'AGL', floor: '3RD', line: 'B', remarks: '3RD FLOOR (B)' },
      { machineId: 'AGL-DNLS-00013', section: 'SE', machineType: 'DNLS', brand: 'JUKI', modelNo: 'LH-3528 S', mfgSerialNo: '3L3AM00289', year: '2015', facility: 'AGL', floor: '3RD', line: 'B', remarks: '3RD FLOOR (B)' },
      { machineId: 'AGL-DNLS-00014', section: 'SE', machineType: 'DNLS', brand: 'JUKI', modelNo: 'LH-3528 S', mfgSerialNo: '3L3BC00372', year: '2015', facility: 'AGL', floor: '3RD', line: 'B', remarks: '3RD FLOOR (B)' },
      { machineId: 'AGL-DNLS-00015', section: 'SE', machineType: 'DNLS', brand: 'JUKI', modelNo: 'LH-3568 S', mfgSerialNo: '3L3ALOOO79', year: '2015', facility: 'AGL', floor: '3RD', line: 'B', remarks: '3RD FLOOR (B)' },
      { machineId: 'AGL-DNLS-00016', section: 'SE', machineType: 'DNLS', brand: 'JUKI', modelNo: 'LH-3528 S', mfgSerialNo: '3L3BC00386', year: '2015', facility: 'AGL', floor: '3RD', line: 'B', remarks: '3RD FLOOR (B)' },
      { machineId: 'AGL-DNLS-00017', section: 'SE', machineType: 'DNLS', brand: 'JUKI', modelNo: 'LH-3528 S', mfgSerialNo: '3L3Y103303', year: '2015', facility: 'AGL', floor: '3RD', line: 'B', remarks: '3RD FLOOR (B)' },
      { machineId: 'AGL-DNLS-00018', section: 'SE', machineType: 'DNLS', brand: 'JUKI', modelNo: 'LH-3528 S', mfgSerialNo: '3L3AD03948', year: '2015', facility: 'AGL', floor: '3RD', remarks: '3RD FLOOR (IDLE)' },
      { machineId: 'AGL-DNLS-00019', section: 'SE', machineType: 'DNLS', brand: 'JUKI', modelNo: 'LH-3528 S', mfgSerialNo: '3L3AH00202', year: '2015', facility: 'AGL', floor: '3RD', remarks: '3RD FLOOR (IDLE)' },
      { machineId: 'AGL-DNLS-00020', section: 'SE', machineType: 'DNLS', brand: 'JUKI', modelNo: 'LH-3528 S', mfgSerialNo: '3L3AM00278', year: '2015', facility: 'AGL', floor: '3RD', remarks: '3RD FLOOR (IDLE)' },
    ];

    for (const m of realMachines) {
      const machine = this.machinesRepo.create({
        ...m,
        status: MachineStatus.ACTIVE,
        currentFacility: m.facility,
        currentFloor: m.floor,
        assetId: await this.generateAssetId(m.section || 'SE', m.facility!),
      });
      await this.machinesRepo.save(machine);
    }
  }

  private async generateAssetId(section: string, facility: string): Promise<string> {
    const prefix = `${section}-${facility}`;
    const lastMachine = await this.machinesRepo
      .createQueryBuilder('m')
      .where('m.assetId LIKE :prefix', { prefix: `${prefix}-%` })
      .orderBy('m.assetId', 'DESC')
      .getOne();

    let seq = 1;
    if (lastMachine?.assetId) {
      const parts = lastMachine.assetId.split('-');
      seq = parseInt(parts[parts.length - 1], 10) + 1;
    }
    return `${prefix}-${String(seq).padStart(5, '0')}`;
  }
}
