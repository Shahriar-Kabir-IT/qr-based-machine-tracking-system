import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Transfer, TransferBasis, TransferStatus } from './entities/transfer.entity';
import { MachinesService } from '../machines/machines.service';
import { MachineStatus } from '../machines/entities/machine.entity';

@Injectable()
export class TransfersService {
  constructor(
    @InjectRepository(Transfer)
    private transfersRepo: Repository<Transfer>,
    private machinesService: MachinesService,
  ) {}

  async findAll(facility?: string): Promise<Transfer[]> {
    const qb = this.transfersRepo.createQueryBuilder('t')
      .leftJoinAndSelect('t.machine', 'machine')
      .orderBy('t.requestedAt', 'DESC');
    if (facility) {
      qb.where('t.fromFacility = :fac OR t.toFacility = :fac', { fac: facility });
    }
    return qb.getMany();
  }

  async findOne(id: number): Promise<Transfer | null> {
    return this.transfersRepo.findOne({ where: { id }, relations: { machine: true } });
  }

  async findLoaned(facility?: string): Promise<Transfer[]> {
    const qb = this.transfersRepo.createQueryBuilder('t')
      .leftJoinAndSelect('t.machine', 'machine')
      .where('t.basis = :basis', { basis: TransferBasis.LOAN })
      .andWhere('t.status IN (:...statuses)', { statuses: [TransferStatus.RECEIVED, TransferStatus.RETURN_REQUESTED, TransferStatus.RETURN_FIRST_APPROVED, TransferStatus.RETURN_SECOND_APPROVED, TransferStatus.RETURN_DISPATCHED] })
      .orderBy('t.expectedReturnDate', 'ASC');
    if (facility) {
      qb.andWhere('(t.fromFacility = :fac OR t.toFacility = :fac)', { fac: facility });
    }
    return qb.getMany();
  }

  async findOverdue(): Promise<Transfer[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.transfersRepo.createQueryBuilder('t')
      .leftJoinAndSelect('t.machine', 'machine')
      .where('t.basis = :basis', { basis: TransferBasis.LOAN })
      .andWhere('t.status IN (:...statuses)', { statuses: [TransferStatus.RECEIVED, TransferStatus.RETURN_REQUESTED, TransferStatus.RETURN_FIRST_APPROVED, TransferStatus.RETURN_SECOND_APPROVED, TransferStatus.RETURN_DISPATCHED] })
      .andWhere('t.expectedReturnDate IS NOT NULL')
      .andWhere('t.expectedReturnDate < :today', { today })
      .orderBy('t.expectedReturnDate', 'ASC')
      .getMany();
  }

  async findForSecurity(): Promise<Transfer[]> {
    return this.transfersRepo.createQueryBuilder('t')
      .leftJoinAndSelect('t.machine', 'machine')
      .where('t.status IN (:...statuses)', {
        statuses: [
          TransferStatus.SECOND_APPROVED,
          TransferStatus.DISPATCHED,
          TransferStatus.RETURN_SECOND_APPROVED,
          TransferStatus.RETURN_DISPATCHED,
        ],
      })
      .orderBy('t.secondApprovedAt', 'DESC')
      .getMany();
  }

  async findTransferHistory(): Promise<Transfer[]> {
    return this.transfersRepo.createQueryBuilder('t')
      .leftJoinAndSelect('t.machine', 'machine')
      .where('t.status IN (:...statuses)', {
        statuses: [
          TransferStatus.RECEIVED,
          TransferStatus.COMPLETED,
          TransferStatus.RETURNED,
          TransferStatus.REJECTED,
        ],
      })
      .orderBy('t.requestedAt', 'DESC')
      .limit(50)
      .getMany();
  }

  async findReturnRequests(): Promise<Transfer[]> {
    return this.transfersRepo.createQueryBuilder('t')
      .leftJoinAndSelect('t.machine', 'machine')
      .where('t.status = :status', { status: TransferStatus.RETURN_REQUESTED })
      .orderBy('t.returnRequestedAt', 'DESC')
      .getMany();
  }

  async create(data: Partial<Transfer>): Promise<Transfer> {
    const transfer = this.transfersRepo.create(data);
    const saved = await this.transfersRepo.save(transfer);
    if (data.machineId) {
      await this.machinesService.updateStatus(data.machineId, MachineStatus.IN_TRANSIT);
    }
    return saved;
  }

  async firstApprove(id: number, userId: number): Promise<Transfer> {
    const t = await this.findOne(id);
    if (!t || t.status !== TransferStatus.REQUESTED) throw new BadRequestException('Invalid status');

    if (t.basis === TransferBasis.INTERNAL) {
      t.status = TransferStatus.COMPLETED;
      t.firstApprovedBy = userId;
      t.firstApprovedAt = new Date();
      t.completedAt = new Date();
      await this.machinesService.internalTransfer(t.machineId, t.toFloor, t.toLine);
      return this.transfersRepo.save(t);
    }

    t.status = TransferStatus.FIRST_APPROVED;
    t.firstApprovedBy = userId;
    t.firstApprovedAt = new Date();
    return this.transfersRepo.save(t);
  }

  async secondApprove(id: number, userId: number): Promise<Transfer> {
    const t = await this.findOne(id);
    if (!t || t.status !== TransferStatus.FIRST_APPROVED) throw new BadRequestException('Invalid status');
    t.status = TransferStatus.SECOND_APPROVED;
    t.secondApprovedBy = userId;
    t.secondApprovedAt = new Date();
    t.chalanNo = await this.generateChalanNo(t);
    return this.transfersRepo.save(t);
  }

  private async generateChalanNo(transfer: Transfer): Promise<string> {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `CH-${transfer.fromFacility}-${yy}${mm}`;
    const last = await this.transfersRepo.createQueryBuilder('t')
      .where('t.chalanNo LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('t.chalanNo', 'DESC')
      .getOne();
    const seq = last?.chalanNo ? Number(last.chalanNo.slice(-4)) + 1 : 1;
    return `${prefix}-${String(seq).padStart(4, '0')}`;
  }

  private async generateReturnChalanNo(transfer: Transfer): Promise<string> {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `RCH-${transfer.toFacility}-${yy}${mm}`;
    const last = await this.transfersRepo.createQueryBuilder('t')
      .where('t.returnChalanNo LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('t.returnChalanNo', 'DESC')
      .getOne();
    const seq = last?.returnChalanNo ? Number(last.returnChalanNo.slice(-4)) + 1 : 1;
    return `${prefix}-${String(seq).padStart(4, '0')}`;
  }

  async dispatch(id: number, userId: number, userName: string): Promise<Transfer> {
    const t = await this.findOne(id);
    if (!t || t.status !== TransferStatus.SECOND_APPROVED) throw new BadRequestException('Invalid status');
    t.status = TransferStatus.DISPATCHED;
    t.dispatchedBy = userId;
    t.dispatchedByName = userName;
    t.dispatchedAt = new Date();
    return this.transfersRepo.save(t);
  }

  async receive(id: number, userId: number, userName: string): Promise<Transfer> {
    const t = await this.findOne(id);
    if (!t || t.status !== TransferStatus.DISPATCHED) throw new BadRequestException('Invalid status');
    t.status = TransferStatus.RECEIVED;
    t.receivedBy = userId;
    t.receivedByName = userName;
    t.receivedAt = new Date();

    if (t.basis === TransferBasis.PERMANENT) {
      if (t.fromFacility !== t.toFacility) {
        await this.machinesService.reassignMachineId(t.machineId, t.toFacility);
      }
      await this.machinesService.permanentTransfer(t.machineId, t.toFacility, t.toFloor);
    } else if (t.basis === TransferBasis.LOAN) {
      await this.machinesService.updateStatusAndLocation(
        t.machineId, MachineStatus.ON_LOAN, t.toFacility, t.toFloor,
      );
    }

    return this.transfersRepo.save(t);
  }

  async requestReturn(id: number, userId: number): Promise<Transfer> {
    const t = await this.findOne(id);
    if (!t || t.status !== TransferStatus.RECEIVED) throw new BadRequestException('Invalid status');
    if (t.basis !== TransferBasis.LOAN) throw new BadRequestException('Only loan transfers can be returned');
    t.status = TransferStatus.RETURN_REQUESTED;
    t.returnRequestedBy = userId;
    t.returnRequestedAt = new Date();
    return this.transfersRepo.save(t);
  }

  async approveReturn(id: number, userId: number): Promise<Transfer> {
    const t = await this.findOne(id);
    if (!t || t.status !== TransferStatus.RETURN_REQUESTED) throw new BadRequestException('Invalid status');
    t.status = TransferStatus.RETURN_FIRST_APPROVED;
    t.returnApprovedBy = userId;
    t.returnApprovedAt = new Date();
    return this.transfersRepo.save(t);
  }

  async secondApproveReturn(id: number, userId: number): Promise<Transfer> {
    const t = await this.findOne(id);
    if (!t || t.status !== TransferStatus.RETURN_FIRST_APPROVED) throw new BadRequestException('Invalid status');
    t.status = TransferStatus.RETURN_SECOND_APPROVED;
    t.returnSecondApprovedBy = userId;
    t.returnSecondApprovedAt = new Date();
    t.returnChalanNo = await this.generateReturnChalanNo(t);
    return this.transfersRepo.save(t);
  }

  async dispatchReturn(id: number, userId: number, userName: string): Promise<Transfer> {
    const t = await this.findOne(id);
    if (!t || t.status !== TransferStatus.RETURN_SECOND_APPROVED) throw new BadRequestException('Invalid status');
    t.status = TransferStatus.RETURN_DISPATCHED;
    t.returnDispatchedBy = userId;
    t.returnDispatchedByName = userName;
    t.returnDispatchedAt = new Date();
    await this.machinesService.updateStatus(t.machineId, MachineStatus.IN_TRANSIT);
    return this.transfersRepo.save(t);
  }

  async receiveReturn(id: number, userId: number, userName: string): Promise<Transfer> {
    const t = await this.findOne(id);
    if (!t || t.status !== TransferStatus.RETURN_DISPATCHED) throw new BadRequestException('Invalid status');
    t.status = TransferStatus.RETURNED;
    t.returnReceivedBy = userId;
    t.returnReceivedByName = userName;
    t.returnReceivedAt = new Date();
    await this.machinesService.updateStatusAndLocation(
      t.machineId, MachineStatus.ACTIVE, t.fromFacility, t.fromFloor,
    );
    return this.transfersRepo.save(t);
  }

  async reject(id: number, userId: number, reason: string): Promise<Transfer> {
    const t = await this.findOne(id);
    if (!t) throw new BadRequestException('Transfer not found');
    t.status = TransferStatus.REJECTED;
    t.rejectedBy = userId;
    t.rejectionReason = reason;
    await this.machinesService.updateStatus(t.machineId, MachineStatus.ACTIVE);
    return this.transfersRepo.save(t);
  }

  async countInTransit(): Promise<number> {
    return this.transfersRepo.count({ where: { status: TransferStatus.DISPATCHED } });
  }

  async countLoaned(): Promise<number> {
    return this.transfersRepo.count({
      where: [
        { basis: TransferBasis.LOAN, status: TransferStatus.RECEIVED },
        { basis: TransferBasis.LOAN, status: TransferStatus.RETURN_REQUESTED },
        { basis: TransferBasis.LOAN, status: TransferStatus.RETURN_FIRST_APPROVED },
        { basis: TransferBasis.LOAN, status: TransferStatus.RETURN_SECOND_APPROVED },
        { basis: TransferBasis.LOAN, status: TransferStatus.RETURN_DISPATCHED },
      ],
    });
  }

  async countOverdue(): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    return this.transfersRepo.createQueryBuilder('t')
      .where('t.basis = :basis', { basis: TransferBasis.LOAN })
      .andWhere('t.status IN (:...statuses)', { statuses: [TransferStatus.RECEIVED, TransferStatus.RETURN_REQUESTED, TransferStatus.RETURN_FIRST_APPROVED, TransferStatus.RETURN_SECOND_APPROVED, TransferStatus.RETURN_DISPATCHED] })
      .andWhere('t.expectedReturnDate IS NOT NULL')
      .andWhere('t.expectedReturnDate < :today', { today })
      .getCount();
  }
}
