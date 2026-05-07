import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentDto, DocumentsQueryDto, UpdateDocumentDto } from './documents.dto';

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertVehicleIds(companyId: string, ids: string[]) {
    for (const id of ids) {
      const v = await this.prisma.vehicle.findFirst({ where: { id, companyId }, select: { id: true } });
      if (!v) throw new BadRequestException(`Vehicle ${id} not found in this company`);
    }
  }

  private async assertDriverIds(companyId: string, ids: string[]) {
    for (const id of ids) {
      const d = await this.prisma.driver.findFirst({ where: { id, companyId }, select: { id: true } });
      if (!d) throw new BadRequestException(`Driver ${id} not found in this company`);
    }
  }

  async findOne(companyId: string, id: string) {
    const doc = await this.prisma.fleetDocument.findFirst({
      where: { id, companyId },
      include: {
        vehicles: { select: { id: true, plateNumber: true, make: true, model: true, year: true } },
        drivers: { select: { id: true, fullName: true } },
      },
    });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  async create(companyId: string, dto: CreateDocumentDto) {
    const vehicleIds = dto.vehicleIds ?? [];
    const driverIds = dto.driverIds ?? [];
    await this.assertVehicleIds(companyId, vehicleIds);
    await this.assertDriverIds(companyId, driverIds);

    const doc = await this.prisma.fleetDocument.create({
      data: {
        companyId,
        type: dto.type,
        fileUrl: dto.fileUrl,
        issueDate: new Date(dto.issueDate),
        expiryDate: new Date(dto.expiryDate),
        issuingAuthority: dto.issuingAuthority ?? null,
        referenceNumber: dto.referenceNumber ?? null,
        notes: dto.notes ?? null,
        vehicles: vehicleIds.length ? { connect: vehicleIds.map(id => ({ id })) } : undefined,
        drivers: driverIds.length ? { connect: driverIds.map(id => ({ id })) } : undefined,
      },
      include: {
        vehicles: { select: { id: true, plateNumber: true, make: true, model: true, year: true } },
        drivers: { select: { id: true, fullName: true } },
      },
    });

    for (const v of doc.vehicles) await this.syncDocumentToVehicle(companyId, v.id, doc.type, doc);
    for (const d of doc.drivers) await this.syncDocumentToDriver(companyId, d.id, doc.type, doc);

    return doc;
  }

  async update(companyId: string, id: string, dto: UpdateDocumentDto) {
    const existing = await this.prisma.fleetDocument.findFirst({
      where: { id, companyId },
      select: { id: true, type: true },
    });
    if (!existing) throw new NotFoundException('Document not found');

    const vehicleIds = dto.vehicleIds;
    const driverIds = dto.driverIds;
    if (vehicleIds) await this.assertVehicleIds(companyId, vehicleIds);
    if (driverIds) await this.assertDriverIds(companyId, driverIds);

    const doc = await this.prisma.fleetDocument.update({
      where: { id },
      data: {
        ...(dto.type ? { type: dto.type } : {}),
        ...(dto.fileUrl ? { fileUrl: dto.fileUrl } : {}),
        ...(dto.issueDate ? { issueDate: new Date(dto.issueDate) } : {}),
        ...(dto.expiryDate ? { expiryDate: new Date(dto.expiryDate) } : {}),
        ...(dto.issuingAuthority !== undefined ? { issuingAuthority: dto.issuingAuthority ?? null } : {}),
        ...(dto.referenceNumber !== undefined ? { referenceNumber: dto.referenceNumber ?? null } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes ?? null } : {}),
        ...(vehicleIds !== undefined ? { vehicles: { set: vehicleIds.map(i => ({ id: i })) } } : {}),
        ...(driverIds !== undefined ? { drivers: { set: driverIds.map(i => ({ id: i })) } } : {}),
      },
      include: {
        vehicles: { select: { id: true, plateNumber: true, make: true, model: true, year: true } },
        drivers: { select: { id: true, fullName: true } },
      },
    });

    const resolvedType = dto.type ?? existing.type;
    for (const v of doc.vehicles) await this.syncDocumentToVehicle(companyId, v.id, resolvedType, doc);
    for (const d of doc.drivers) await this.syncDocumentToDriver(companyId, d.id, resolvedType, doc);

    return doc;
  }

  private async syncDocumentToVehicle(
    companyId: string,
    vehicleId: string,
    type: string,
    doc: { fileUrl: string; issueDate: Date; expiryDate: Date; referenceNumber: string | null },
  ) {
    const toDate = (d: Date) => d.toISOString().slice(0, 10);
    let data: Record<string, unknown>;
    switch (type) {
      case 'VEHICLE_REGISTRATION':
        data = { licenseIssuanceDate: toDate(doc.issueDate), licenseExpiryDate: toDate(doc.expiryDate) };
        break;
      case 'VEHICLE_INSURANCE':
        data = { insuranceExpiryDate: toDate(doc.expiryDate), insuranceStatus: 'Valid' };
        break;
      case 'PERIODIC_INSPECTION':
        data = { inspectionExpiryDate: toDate(doc.expiryDate), mvpiStatus: 'Valid' };
        break;
      case 'OPERATION_CARD':
        data = {
          operationCardFileUrl: doc.fileUrl,
          operationCardIssueDate: toDate(doc.issueDate),
          operationCardExpiryDate: toDate(doc.expiryDate),
          operationCardNumber: doc.referenceNumber ?? undefined,
        };
        break;
      default:
        return;
    }
    await this.prisma.vehicle.updateMany({ where: { id: vehicleId, companyId }, data });
  }

  private async syncDocumentToDriver(
    companyId: string,
    driverId: string,
    type: string,
    doc: { issueDate: Date; expiryDate: Date; referenceNumber: string | null },
  ) {
    if (type !== 'DRIVER_LICENSE') return;
    await this.prisma.driver.updateMany({
      where: { id: driverId, companyId },
      data: {
        licenseExpiry: doc.expiryDate,
        ...(doc.referenceNumber ? { licenseNumber: doc.referenceNumber } : {}),
      },
    });
  }

  async remove(companyId: string, id: string) {
    const existing = await this.prisma.fleetDocument.findFirst({ where: { id, companyId }, select: { id: true } });
    if (!existing) throw new NotFoundException('Document not found');
    return this.prisma.fleetDocument.delete({ where: { id } });
  }

  async findAll(companyId: string, query: DocumentsQueryDto) {
    const { page = 1, limit = 20, search, type, status = 'all', vehicleId, driverId } = query;
    const skip = (page - 1) * limit;

    const now = new Date();
    const soon = new Date();
    soon.setDate(soon.getDate() + 30);

    const baseWhere: Prisma.FleetDocumentWhereInput = {
      companyId,
      ...(type ? { type } : {}),
      ...(vehicleId ? { vehicles: { some: { id: vehicleId } } } : {}),
      ...(driverId ? { drivers: { some: { id: driverId } } } : {}),
      ...(search
        ? {
            OR: [
              { referenceNumber: { contains: search, mode: 'insensitive' } },
              { issuingAuthority: { contains: search, mode: 'insensitive' } },
              { vehicles: { some: { plateNumber: { contains: search, mode: 'insensitive' } } } },
              { drivers: { some: { fullName: { contains: search, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    };

    const statusWhere: Prisma.FleetDocumentWhereInput =
      status === 'expired'
        ? { expiryDate: { lt: now } }
        : status === 'expiring'
          ? { expiryDate: { gte: now, lte: soon } }
          : status === 'valid'
            ? { expiryDate: { gt: soon } }
            : {};

    const where: Prisma.FleetDocumentWhereInput = { AND: [baseWhere, statusWhere] };

    const [data, total, expiredCount, expiringCount, validCount] = await this.prisma.$transaction([
      this.prisma.fleetDocument.findMany({
        where,
        orderBy: { expiryDate: 'asc' },
        skip,
        take: limit,
        include: {
          vehicles: { select: { id: true, plateNumber: true, make: true, model: true, year: true } },
          drivers: { select: { id: true, fullName: true } },
        },
      }),
      this.prisma.fleetDocument.count({ where }),
      this.prisma.fleetDocument.count({ where: { AND: [baseWhere, { expiryDate: { lt: now } }] } }),
      this.prisma.fleetDocument.count({ where: { AND: [baseWhere, { expiryDate: { gte: now, lte: soon } }] } }),
      this.prisma.fleetDocument.count({ where: { AND: [baseWhere, { expiryDate: { gt: soon } }] } }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      summary: { expired: expiredCount, expiring: expiringCount, valid: validCount, total: expiredCount + expiringCount + validCount },
    };
  }

  /** Get expiring documents summary for dashboard (expired + next 60 days) */
  async getExpiringSummary(companyId: string) {
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const in60 = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    const [expired, critical, warning] = await this.prisma.$transaction([
      this.prisma.fleetDocument.findMany({
        where: { companyId, expiryDate: { lt: now } },
        orderBy: { expiryDate: 'asc' },
        include: { vehicles: { select: { id: true, plateNumber: true } }, drivers: { select: { id: true, fullName: true } } },
      }),
      this.prisma.fleetDocument.findMany({
        where: { companyId, expiryDate: { gte: now, lte: in30 } },
        orderBy: { expiryDate: 'asc' },
        include: { vehicles: { select: { id: true, plateNumber: true } }, drivers: { select: { id: true, fullName: true } } },
      }),
      this.prisma.fleetDocument.findMany({
        where: { companyId, expiryDate: { gt: in30, lte: in60 } },
        orderBy: { expiryDate: 'asc' },
        include: { vehicles: { select: { id: true, plateNumber: true } }, drivers: { select: { id: true, fullName: true } } },
      }),
    ]);

    return { expired, critical, warning };
  }
}
