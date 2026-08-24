import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepo: Repository<User>,
  ) {}

  async findAll(): Promise<User[]> {
    return this.usersRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findMechanics(): Promise<Partial<User>[]> {
    const mechanics = await this.usersRepo.find({
      where: { role: UserRole.MECHANIC },
      order: { facility: 'ASC', floor: 'ASC', name: 'ASC' },
    });
    return mechanics.map(({ id, username, name, facility, floor }) => ({ id, username, name, facility, floor }));
  }

  async findOne(id: number): Promise<User | null> {
    return this.usersRepo.findOneBy({ id });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.usersRepo.findOneBy({ username });
  }

  async create(data: Partial<User>): Promise<User> {
    const hashed = await bcrypt.hash(data.password!, 10);
    const user = this.usersRepo.create({ ...data, password: hashed });
    return this.usersRepo.save(user);
  }

  async update(id: number, data: Partial<User>): Promise<User | null> {
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }
    await this.usersRepo.update(id, data);
    return this.findOne(id);
  }

  async delete(id: number): Promise<void> {
    await this.usersRepo.delete(id);
  }

  async seed() {
    const count = await this.usersRepo.count();
    if (count > 0) return;
    await this.create({
      username: 'workstudy',
      password: 'admin123',
      name: 'Work Study Super Admin',
      role: UserRole.SUPER_ADMIN,
    });
    await this.create({
      username: 'administration',
      password: 'admin123',
      name: 'AGL Administration',
      role: UserRole.ADMIN,
      facility: 'AGL',
    });
    await this.create({
      username: 'agl_user',
      password: 'user123',
      name: 'AGL Factory User',
      role: UserRole.USER,
      facility: 'AGL',
    });
    await this.create({
      username: 'ajl_user',
      password: 'user123',
      name: 'AJL Factory User',
      role: UserRole.USER,
      facility: 'AJL',
    });
    await this.create({
      username: 'abm_user',
      password: 'user123',
      name: 'ABM Factory User',
      role: UserRole.USER,
      facility: 'ABM',
    });
    await this.create({
      username: 'linechief',
      password: 'user123',
      name: 'Line Chief',
      role: UserRole.LINE_CHIEF,
      facility: 'AGL',
      floor: '3RD',
    });
    await this.create({
      username: 'mechanic',
      password: 'user123',
      name: 'Mechanic',
      role: UserRole.MECHANIC,
      facility: 'AGL',
      floor: '3RD',
    });
    await this.create({
      username: 'sysadmin',
      password: 'admin123',
      name: 'System Administrator',
      role: UserRole.SYSTEM_ADMIN,
    });
  }
}
