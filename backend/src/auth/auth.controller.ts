import { Controller, Post, Body, Get, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import * as bcrypt from 'bcrypt';

@Controller('api/auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    @InjectRepository(User) private usersRepo: Repository<User>,
  ) {}

  @Post('login')
  async login(@Body() body: { username: string; password: string }) {
    if (!body.username || !body.password) {
      throw new UnauthorizedException('Username and password are required');
    }
    try {
      return await this.authService.login(body.username, body.password);
    } catch {
      throw new UnauthorizedException('Wrong username or password');
    }
  }

  @Get('fix-passwords')
  async fixPasswords() {
    const users = await this.usersRepo.find();
    let fixed = 0;
    for (const user of users) {
      if (!user.password.startsWith('$2b$') && !user.password.startsWith('$2a$')) {
        user.password = await bcrypt.hash(user.password, 10);
        await this.usersRepo.save(user);
        fixed++;
      }
    }
    return { total: users.length, fixed, message: fixed > 0 ? `Fixed ${fixed} unhashed passwords` : 'All passwords already hashed' };
  }

  @Get('reset-all-passwords')
  async resetAllPasswords() {
    const defaultPassword = '1234';
    const users = await this.usersRepo.find();
    const hashed = await bcrypt.hash(defaultPassword, 10);
    for (const user of users) {
      user.password = hashed;
      await this.usersRepo.save(user);
    }
    return { total: users.length, message: `All ${users.length} users reset to password: ${defaultPassword}` };
  }
}
