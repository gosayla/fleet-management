import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentDto, DocumentsQueryDto, UpdateDocumentDto } from './documents.dto';

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertRelations(companyId: string, dto: { vehicleId?: string; driverId?: string }) {
    if (dto.vehicleId) {
      const vehicle = await this.prisma.vehicle.findFirst({
        where: { id: dto.vehicleId, companyId },
        select: { id: true },
      });
      if (!vehicle) throw new BadRequestException('Vehicle not found in this company');
    }

    if (dto.driverId) {
      const driver = await this.prisma.driver.findFirst({
        where: { id: dto.driverId, companyId },
        select: { id: true },
      });
      if (!driver) throw new BadRequestException('Driver not found in this company');
    }
  }

  async findOne(companyId: string, id: string) {
    const doc = await this.prisma.fleetDocument.findFirst({
      where: { id, companyId },
      include: {
        vehicle: { select: { id: true, plateNumber: true, make: true, model: true, year: true } },
        driver: { select: { id: true, fullName: true } },
      },
    });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  async create(companyId: string, dto: CreateDocumentDto) {
    await this.assertRelations(companyId, dto);

    const doc = await this.prisma.fleetDocument.create({
      data: {
        companyId,
        type: dto.type,
        fileUrl: dto.fileUrl,
        issueDate: new Date(dto.issueDate),
        expiryDate: new Date(dto.expiryDate),
        vehicleId: dto.vehicleId || null,
        driverId: dto.driverId || null,
        issuingAuthority: dto.issuingAuthority || null,
        referenceNumber: dto.referenceNumber || null,
      },
    });

    if (doc.vehicleId) await this.syncDocumentToVehicle(companyId, doc.vehicleId, doc.type, doc);
    if (doc.driverId) await this.syncDocumentToDriver(companyId, doc.driverId, doc.type, doc);

    return doc;
  }

  async update(companyId: string, id: string, dto: UpdateDocumentDto) {
    const existing = await this.prisma.fleetDocument.findFirst({
      where: { id, companyId },
      select: { id: true, type: true, vehicleId: true, driverId: true },
    });

    if (!existing) throw new NotFoundException('Document not found');

    await this.assertRelations(companyId, dto);

    const doc = await this.prisma.fleetDocument.update({
      where: { id },
      data: {
        ...(dto.type ? { type: dto.type } : {}),
        ...(dto.fileUrl ? { fileUrl: dto.fileUrl } : {}),
        ...(dto.issueDate ? { issueDate: new Date(dto.issueDate) } : {}),
        ...(dto.expiryDate ? { expiryDate: new Date(dto.expiryDate) } : {}),
        ...(dto.vehicleId !== undefined ? { vehicleId: dto.vehicleId || null } : {}),
        ...(dto.driverId !== undefined ? { driverId: dto.driverId || null } : {}),
        ...(dto.issuingAuthority !== undefined
          ? { issuingAuthority: dto.issuingAuthority || null }
          : {}),
        ...(dto.referenceNumber !== undefined
          ? { referenceNumber: dto.referenceNumber || null }
          : {}),
      },
    });

    const resolvedType = dto.type ?? existing.type;
    const resolvedVehicleId = dto.vehicleId !== undefined ? (dto.vehicleId || null) : existing.vehicleId;
    const resolvedDriverId = dto.driverId !== undefined ? (dto.driverId || null) : existing.driverId;
    if (resolvedVehicleId) await this.syncDocumentToVehicle(companyId, resolvedVehicleId, resolvedType, doc);
    if (resolvedDriverId) await this.syncDocumentToDriver(companyId, resolvedDriverId, resolvedType, doc);

    return doc;
  }

  /** Sync document data back to the linked vehicle based on document type */
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
        data = {
          licenseIssuanceDate: toDate(doc.issueDate),
          licenseExpiryDate: toDate(doc.expiryDate),
        };
        break;
      case 'VEHICLE_INSURANCE':
        data = {
          insuranceExpiryDate: toDate(doc.expiryDate),
          insuranceStatus: 'Valid',
        };
        break;
      case 'PERIODIC_INSPECTION':
        data = {
          inspectionExpiryDate: toDate(doc.expiryDate),
          mvpiStatus: 'Valid',
        };
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

  /** Sync document data back to the linked driver based on document type */
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
    const existing = await this.prisma.fleetDocument.findFirst({
      where: { id, companyId },
      select: { id: true },
    });

    if (!existing) throw new NotFoundException('Document not found');

    return this.prisma.fleetDocument.delete({ where: { id } });
  }

  async findAll(companyId: string, query: DocumentsQueryDto) {
    const { page = 1, limit = 20, search, type, status = 'all' } = query;
    const skip = (page - 1) * limit;

    const now = new Date();
    const soon = new Date();
    soon.setDate(soon.getDate() + 30);

    const { vehicleId, driverId } = query;

    const baseWhere: Prisma.FleetDocumentWhereInput = {
      companyId,
      ...(type ? { type } : {}),
      ...(vehicleId ? { vehicleId } : {}),
      ...(driverId ? { driverId } : {}),
      ...(search
        ? {
            OR: [
              { referenceNumber: { contains: search, mode: 'insensitive' } },
              { issuingAuthority: { contains: search, mode: 'insensitive' } },
              { vehicle: { plateNumber: { contains: search, mode: 'insensitive' } } },
              { driver: { fullName: { contains: search, mode: 'insensitive' } } },
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

    const where: Prisma.FleetDocumentWhereInput = {
      AND: [baseWhere, statusWhere],
    };

    const [data, total, expiredCount, expiringCount, validCount] =
      await this.prisma.$transaction([
        this.prisma.fleetDocument.findMany({
          where,
          orderBy: { expiryDate: 'asc' },
          skip,
          take: limit,
          include: {
            vehicle: {
              select: {
                id: true,
                plateNumber: true,
                make: true,
                model: true,
                year: true,
              },
            },
            driver: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        }),
        this.prisma.fleetDocument.count({ where }),
        this.prisma.fleetDocument.count({
          where: { AND: [baseWhere, { expiryDate: { lt: now } }] },
        }),
        this.prisma.fleetDocument.count({
          where: { AND: [baseWhere, { expiryDate: { gte: now, lte: soon } }] },
        }),
        this.prisma.fleetDocument.count({
          where: { AND: [baseWhere, { expiryDate: { gt: soon } }] },
        }),
      ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      summary: {
        expired: expiredCount,
        expiring: expiringCount,
        valid: validCount,
        total: expiredCount + expiringCount + validCount,
      },
    };
  }
}
