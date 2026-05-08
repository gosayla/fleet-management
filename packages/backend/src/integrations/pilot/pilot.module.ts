import { Module } from '@nestjs/common';
import { PilotController } from './pilot.controller';
import { PilotClient } from './pilot.client';
import { PilotSyncService } from './pilot-sync.service';

@Module({
  controllers: [PilotController],
  providers: [PilotClient, PilotSyncService],
  exports: [PilotClient, PilotSyncService],
})
export class PilotModule {}
