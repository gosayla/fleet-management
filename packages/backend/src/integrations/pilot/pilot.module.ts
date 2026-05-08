import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PilotController } from './pilot.controller';
import { PilotClient } from './pilot.client';
import { PilotSyncService } from './pilot-sync.service';
import { GatewayModule } from '../../gateway/gateway.module';

@Module({
  imports: [GatewayModule, ConfigModule],
  controllers: [PilotController],
  providers: [PilotClient, PilotSyncService],
  exports: [PilotClient, PilotSyncService],
})
export class PilotModule {}
