import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateStaffAssignmentDto,
  ReturnStaffVehicleDto,
  UpdateStaffAssignmentDto,
} from './staff-assignments.dto';

@Injectable()
export class StaffAssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  private notFound(id: string): never {
    throw new NotFoundException(`Staff assignment ${id} not found`);
  }

  async findAll(companyId: string, vehicleId?: string) {
    return this.prisma.staffVehicleAssignment.findMany({
      where: {
        companyId,
        ...(vehicleId ? { vehicleId } : {}),
      },
      include: {
        vehicle: {
          select: { id: true, plateNumber: true, make: true, model: true, color: true },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });
  }

  async findActiveByVehicle(companyId: string, vehicleId: string) {
    return this.prisma.staffVehicleAssignment.findFirst({
      where: { companyId, vehicleId, returnedAt: null },
      orderBy: { assignedAt: 'desc' },
    });
  }

  async findOne(companyId: string, id: string) {
    const record = await this.prisma.staffVehicleAssignment.findFirst({
      where: { id, companyId },
      include: {
        vehicle: {
          select: { id: true, plateNumber: true, make: true, model: true, color: true },
        },
      },
    });
    if (!record) this.notFound(id);
    return record;
  }

  async create(companyId: string, dto: CreateStaffAssignmentDto) {
    // Confirm the vehicle belongs to this company and is a STAFF vehicle
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: dto.vehicleId, companyId },
    });
    if (!vehicle) throw new NotFoundException(`Vehicle ${dto.vehicleId} not found`);
    if (vehicle.usageType !== 'STAFF') {
      throw new BadRequestException('Only STAFF vehicles can have staff assignments. Change the vehicle usage type first.');
    }

    // Close any existing active assignment first
    await this.prisma.staffVehicleAssignment.updateMany({
      where: { vehicleId: dto.vehicleId, companyId, returnedAt: null },
      data: { returnedAt: new Date() },
    });

    return this.prisma.staffVehicleAssignment.create({
      data: {
        companyId,
        vehicleId: dto.vehicleId,
        assigneeName: dto.assigneeName,
        assigneeTitle: dto.assigneeTitle,
        assigneePhone: dto.assigneePhone,
        assigneeNationalId: dto.assigneeNationalId,
        assignedAt: dto.assignedAt ? new Date(dto.assignedAt) : new Date(),
        odometerOut: dto.odometerOut,
        fuelLevel: dto.fuelLevel,
        conditionRating: dto.conditionRating,
        conditionPhotos: dto.conditionPhotos ?? [],
        signatureUrl: dto.signatureUrl,
        notes: dto.notes,
      },
      include: {
        vehicle: {
          select: { id: true, plateNumber: true, make: true, model: true, color: true },
        },
      },
    });
  }

  async returnVehicle(companyId: string, id: string, dto: ReturnStaffVehicleDto) {
    const record = await this.prisma.staffVehicleAssignment.findFirst({
      where: { id, companyId, returnedAt: null },
    });
    if (!record) throw new NotFoundException(`Active staff assignment ${id} not found`);

    return this.prisma.staffVehicleAssignment.update({
      where: { id },
      data: {
        returnedAt: dto.returnedAt ? new Date(dto.returnedAt) : new Date(),
        odometerIn: dto.odometerIn,
        notes: dto.notes ?? record.notes,
      },
    });
  }

  async update(companyId: string, id: string, dto: UpdateStaffAssignmentDto) {
    const record = await this.prisma.staffVehicleAssignment.findFirst({
      where: { id, companyId },
    });
    if (!record) this.notFound(id);

    return this.prisma.staffVehicleAssignment.update({
      where: { id },
      data: {
        assigneeName: dto.assigneeName,
        assigneeTitle: dto.assigneeTitle,
        assigneePhone: dto.assigneePhone,
        assigneeNationalId: dto.assigneeNationalId,
        odometerOut: dto.odometerOut,
        fuelLevel: dto.fuelLevel,
        conditionRating: dto.conditionRating,
        ...(dto.conditionPhotos !== undefined ? { conditionPhotos: dto.conditionPhotos } : {}),
        ...(dto.signatureUrl !== undefined ? { signatureUrl: dto.signatureUrl } : {}),
        notes: dto.notes,
      },
    });
  }

  async remove(companyId: string, id: string) {
    const record = await this.prisma.staffVehicleAssignment.findFirst({
      where: { id, companyId },
    });
    if (!record) this.notFound(id);
    await this.prisma.staffVehicleAssignment.delete({ where: { id } });
    return { success: true };
  }
}
