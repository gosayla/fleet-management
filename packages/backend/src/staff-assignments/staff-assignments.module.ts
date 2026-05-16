import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StaffAssignmentsService } from './staff-assignments.service';
import { StaffAssignmentsController } from './staff-assignments.controller';

@Module({
  imports: [PrismaModule],
  controllers: [StaffAssignmentsController],
  providers: [StaffAssignmentsService],
  exports: [StaffAssignmentsService],
})
export class StaffAssignmentsModule {}
