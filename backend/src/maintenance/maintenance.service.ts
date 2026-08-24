import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MaintenanceLog, MaintenanceStatus } from './entities/maintenance.entity';

@Injectable()
export class MaintenanceService {
  constructor(
    @InjectRepository(MaintenanceLog)
    private maintenanceRepo: Repository<MaintenanceLog>,
  ) {}

  async findAll(facility?: string, floor?: string): Promise<MaintenanceLog[]> {
    const records = await this.maintenanceRepo.find({ relations: { machine: true }, order: { performedAt: 'DESC' } });
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

  async findByMachine(machineId: number): Promise<MaintenanceLog[]> {
    return this.maintenanceRepo.find({ where: { machineId }, order: { performedAt: 'DESC' } });
  }

  async findOne(id: number): Promise<MaintenanceLog | null> {
    return this.maintenanceRepo.findOne({ where: { id }, relations: { machine: true } });
  }

  async create(data: Partial<MaintenanceLog>): Promise<MaintenanceLog> {
    const log = this.maintenanceRepo.create(data);
    return this.maintenanceRepo.save(log);
  }

  async updateStatus(id: number, status: MaintenanceStatus): Promise<MaintenanceLog | null> {
    await this.maintenanceRepo.update(id, { status });
    return this.findOne(id);
  }

  async countByStatus(): Promise<{ complete: number; incomplete: number }> {
    const complete = await this.maintenanceRepo.count({ where: { status: MaintenanceStatus.COMPLETE } });
    const incomplete = await this.maintenanceRepo.count({ where: { status: MaintenanceStatus.INCOMPLETE } });
    return { complete, incomplete };
  }
}
