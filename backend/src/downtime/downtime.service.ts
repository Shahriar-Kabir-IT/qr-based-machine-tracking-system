import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { DowntimeRecord, DowntimeStatus } from './entities/downtime.entity';
import { MachinesService } from '../machines/machines.service';
import { MachineStatus } from '../machines/entities/machine.entity';

@Injectable()
export class DowntimeService {
  constructor(
    @InjectRepository(DowntimeRecord)
    private downtimeRepo: Repository<DowntimeRecord>,
    private machinesService: MachinesService,
  ) {}

  async findAll(facility?: string, floor?: string): Promise<DowntimeRecord[]> {
    const records = await this.downtimeRepo.find({ relations: { machine: true }, order: { reportedAt: 'DESC' } });
    if (facility || floor) {
      return records.filter((r) => {
        const m = r.machine;
        if (!m) return false;
        if (facility && m.currentFacility !== facility && m.facility !== facility) return false;
        if (floor && m.currentFloor !== floor && m.floor !== floor) return false;
        return true;
      });
    }
    return records;
  }

  async findActive(facility?: string, floor?: string): Promise<DowntimeRecord[]> {
    const records = await this.downtimeRepo.find({
      where: { status: In([DowntimeStatus.REPORTED, DowntimeStatus.ACKNOWLEDGED, DowntimeStatus.REPAIR_DONE]) },
      relations: { machine: true },
      order: { reportedAt: 'DESC' },
    });
    if (facility || floor) {
      return records.filter((r) => {
        const m = r.machine;
        if (!m) return false;
        if (facility && m.currentFacility !== facility && m.facility !== facility) return false;
        if (floor && m.currentFloor !== floor && m.floor !== floor) return false;
        return true;
      });
    }
    return records;
  }

  async findByMachine(machineId: number): Promise<DowntimeRecord[]> {
    return this.downtimeRepo.find({ where: { machineId }, relations: { machine: true }, order: { reportedAt: 'DESC' } });
  }

  async findOne(id: number): Promise<DowntimeRecord | null> {
    return this.downtimeRepo.findOne({ where: { id }, relations: { machine: true } });
  }

  async create(data: Partial<DowntimeRecord>): Promise<DowntimeRecord> {
    const record = this.downtimeRepo.create({ ...data, status: DowntimeStatus.REPORTED });
    const saved = await this.downtimeRepo.save(record);
    if (data.machineId) {
      await this.machinesService.updateStatus(data.machineId, MachineStatus.UNDER_REPAIR);
    }
    return saved;
  }

  async acknowledge(id: number, mechanicUserId: number, mechanicName: string): Promise<DowntimeRecord> {
    const r = await this.findOne(id);
    if (!r || r.status !== DowntimeStatus.REPORTED) throw new BadRequestException('Not in Reported status');
    r.status = DowntimeStatus.ACKNOWLEDGED;
    r.mechanicUserId = mechanicUserId;
    r.mechanicName = mechanicName;
    r.acknowledgedAt = new Date();
    return this.downtimeRepo.save(r);
  }

  async finishRepair(id: number, repairNote: string, sparePartsUsed: string): Promise<DowntimeRecord> {
    const r = await this.findOne(id);
    if (!r || r.status !== DowntimeStatus.ACKNOWLEDGED) throw new BadRequestException('Not in Acknowledged status');
    r.status = DowntimeStatus.REPAIR_DONE;
    r.repairNote = repairNote;
    r.sparePartsUsed = sparePartsUsed || '';
    r.finishedAt = new Date();
    r.repairDurationMinutes = Math.round((r.finishedAt.getTime() - r.acknowledgedAt.getTime()) / 60000);
    return this.downtimeRepo.save(r);
  }

  async verify(id: number, verifiedByUserId: number, verificationNote: string): Promise<DowntimeRecord> {
    const r = await this.findOne(id);
    if (!r || r.status !== DowntimeStatus.REPAIR_DONE) throw new BadRequestException('Not in Repair Done status');
    r.status = DowntimeStatus.SERVICE_COMPLETE;
    r.verifiedByUserId = verifiedByUserId;
    r.verificationNote = verificationNote;
    r.verifiedAt = new Date();
    r.totalDowntimeMinutes = Math.round((r.verifiedAt.getTime() - r.reportedAt.getTime()) / 60000);
    await this.machinesService.updateStatus(r.machineId, MachineStatus.ACTIVE);
    return this.downtimeRepo.save(r);
  }

  async countByStatus(status: DowntimeStatus): Promise<number> {
    return this.downtimeRepo.count({ where: { status } });
  }

  async mechanicKpi(filterMechanicId?: number): Promise<any> {
    const where: any = { status: In([DowntimeStatus.SERVICE_COMPLETE, DowntimeStatus.REPAIR_DONE]) };
    if (filterMechanicId) where.mechanicUserId = filterMechanicId;
    const completed = await this.downtimeRepo.find({
      where,
      relations: { machine: true },
      order: { reportedAt: 'DESC' },
    });

    const mechanicMap: Record<number, any> = {};

    for (const r of completed) {
      if (!r.mechanicUserId) continue;
      if (!mechanicMap[r.mechanicUserId]) {
        mechanicMap[r.mechanicUserId] = {
          mechanicUserId: r.mechanicUserId,
          mechanicName: r.mechanicName,
          totalRepairs: 0,
          responseTimes: [],
          repairTimes: [],
          totalDowntimes: [],
          monthlyBreakdown: {},
          records: [],
        };
      }
      const m = mechanicMap[r.mechanicUserId];
      m.totalRepairs++;

      if (r.reportedAt && r.acknowledgedAt) {
        m.responseTimes.push(Math.round((r.acknowledgedAt.getTime() - r.reportedAt.getTime()) / 60000));
      }
      if (r.repairDurationMinutes != null) {
        m.repairTimes.push(r.repairDurationMinutes);
      }
      if (r.totalDowntimeMinutes != null) {
        m.totalDowntimes.push(r.totalDowntimeMinutes);
      }

      const month = r.reportedAt.toISOString().slice(0, 7);
      m.monthlyBreakdown[month] = (m.monthlyBreakdown[month] || 0) + 1;

      m.records.push({
        id: r.id,
        machineAssetId: r.machine?.assetId || null,
        machineType: r.machineType,
        line: r.line,
        floor: r.floor,
        issueDescription: r.issueDescription,
        repairNote: r.repairNote,
        sparePartsUsed: r.sparePartsUsed,
        status: r.status,
        reportedAt: r.reportedAt,
        acknowledgedAt: r.acknowledgedAt,
        finishedAt: r.finishedAt,
        verifiedAt: r.verifiedAt,
        responseMinutes: r.reportedAt && r.acknowledgedAt ? Math.round((r.acknowledgedAt.getTime() - r.reportedAt.getTime()) / 60000) : null,
        repairDurationMinutes: r.repairDurationMinutes,
        totalDowntimeMinutes: r.totalDowntimeMinutes,
      });
    }

    const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

    return Object.values(mechanicMap).map((m: any) => ({
      mechanicUserId: m.mechanicUserId,
      mechanicName: m.mechanicName,
      totalRepairs: m.totalRepairs,
      avgResponseMinutes: avg(m.responseTimes),
      avgRepairMinutes: avg(m.repairTimes),
      avgTotalDowntimeMinutes: avg(m.totalDowntimes),
      fastestRepairMinutes: m.repairTimes.length ? Math.min(...m.repairTimes) : 0,
      slowestRepairMinutes: m.repairTimes.length ? Math.max(...m.repairTimes) : 0,
      monthlyBreakdown: m.monthlyBreakdown,
      records: m.records,
    }));
  }

  async recentActivity(limit = 10): Promise<DowntimeRecord[]> {
    return this.downtimeRepo.find({
      relations: { machine: true },
      order: { reportedAt: 'DESC' },
      take: limit,
    });
  }
}
