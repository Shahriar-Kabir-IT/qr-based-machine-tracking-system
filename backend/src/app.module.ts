import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MachinesModule } from './machines/machines.module';
import { TransfersModule } from './transfers/transfers.module';
import { DowntimeModule } from './downtime/downtime.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { SparePartsModule } from './spare-parts/spare-parts.module';
import { RentalModule } from './rental/rental.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { UsersService } from './users/users.service';
import { MachinesService } from './machines/machines.service';
import { SystemController } from './system.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: parseInt(config.get('DB_PORT', '5432')),
        username: config.get('DB_USERNAME', 'arko'),
        password: config.get('DB_PASSWORD', ''),
        database: config.get('DB_DATABASE', 'ananta_swing'),
        autoLoadEntities: true,
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    MachinesModule,
    TransfersModule,
    DowntimeModule,
    MaintenanceModule,
    SparePartsModule,
    RentalModule,
    DashboardModule,
  ],
  controllers: [SystemController],
})
export class AppModule implements OnModuleInit {
  constructor(
    private usersService: UsersService,
    private machinesService: MachinesService,
  ) {}

  async onModuleInit() {
    await this.usersService.seed();
    await this.machinesService.seed();
  }
}
