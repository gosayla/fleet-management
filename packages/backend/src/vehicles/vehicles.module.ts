import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { VehiclesService } from './vehicles.service';
import { VehiclesController } from './vehicles.controller';

@Module({
  imports: [MulterModule.register({ storage: undefined })], // use memory storage (buffer)
  controllers: [VehiclesController],
  providers: [VehiclesService],
  exports: [VehiclesService],
})
export class VehiclesModule {}
