import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { DriversModule } from './drivers/drivers.module';
import { TripsModule } from './trips/trips.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { FuelModule } from './fuel/fuel.module';
import { DocumentsModule } from './documents/documents.module';
import { TammModule } from './integrations/tamm/tamm.module';
import { NaqlModule } from './integrations/naql/naql.module';
import { PilotModule } from './integrations/pilot/pilot.module';
import { NotificationsModule } from './notifications/notifications.module';
import { GatewayModule } from './gateway/gateway.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { UsersModule } from './users/users.module';
import { SettingsModule } from './settings/settings.module';
import { ContractsModule } from './contracts/contracts.module';
import { RentalsModule } from './rentals/rentals.module';
import { AuditModule } from './audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    VehiclesModule,
    DriversModule,
    TripsModule,
    MaintenanceModule,
    FuelModule,
    DocumentsModule,
    TammModule,
    NaqlModule,
    PilotModule,
    NotificationsModule,
    GatewayModule,
    DashboardModule,
    UsersModule,
    SettingsModule,
    ContractsModule,
    RentalsModule,
    AuditModule,
  ],
})
export class AppModule {}
