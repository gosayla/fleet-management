import { Module } from '@nestjs/common';
import { TammClient } from './tamm.client';
import { TammSyncService } from './tamm-sync.service';
import { TammController } from './tamm.controller';

@Module({
  controllers: [TammController],
  providers: [TammClient, TammSyncService],
  exports: [TammClient],
})
export class TammModule {}
