import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentDto, DocumentsQueryDto, UpdateDocumentDto } from './documents.dto';

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly vehicleSyncedTypes = [
    'VEHICLE_REGISTRATION',
    'VEHICLE_INSURANCE',
    'PERIODIC_INSPECTION',
    'OPERATION_CARD',
  ] as const;

  private readonly vehicleOnlyDocumentTypes = new Set([
    'VEHICLE_REGISTRATION',
    'VEHICLE_INSURANCE',
    'PERIODIC_INSPECTION',
    'TRANSPORT_PERMIT',
    'OWNERSHIP_DEED',
    'OPERATION_CARD',
  ]);

  private readonly driverOnlyDocumentTypes = new Set([
    'DRIVER_LICENSE',
    'DRIVER_CARD',
  ]);

  private toDateOnly(value: Date) {
    return value.toISOString().slice(0, 10);
  }

  private statusFromExpiry(expiry: Date) {
    return expiry >= new Date() ? 'Valid' : 'Expired';
  }

  private validateDocumentTargets(type: string, vehicleIds: string[], driverIds: string[]) {
    if (this.vehicleOnlyDocumentTypes.has(type)) {
      if (!vehicleIds.length) {
        throw new BadRequestException(`Document type ${type} must be linked to at least one vehicle`);
      }
      if (driverIds.length) {
        throw new BadRequestException(`Document type ${type} cannot be linked to drivers`);
      }
    }

    if (this.driverOnlyDocumentTypes.has(type)) {
      if (!driverIds.length) {
        throw new BadRequestException(`Document type ${type} must be linked to at least one driver`);
      }
      if (vehicleIds.length) {
        throw new BadRequestException(`Document type ${type} cannot be linked to vehicles`);
      }
    }
  }

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
    this.validateDocumentTargets(dto.type, vehicleIds, driverIds);
    await this.assertVehicleIds(companyId, vehicleIds);
    await this.assertDriverIds(companyId, driverIds);

    const doc = await this.prisma.fleetDocument.create({
      data: {
        companyId,
        type: dto.type,
        licenseType: dto.licenseType ?? null,
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

    for (const v of doc.vehicles) await this.refreshVehicleDocumentState(companyId, v.id);
    for (const d of doc.drivers) await this.refreshDriverDocumentState(companyId, d.id);

    return doc;
  }

  async update(companyId: string, id: string, dto: UpdateDocumentDto) {
    const existing = await this.prisma.fleetDocument.findFirst({
      where: { id, companyId },
      select: {
        id: true,
        type: true,
        vehicles: { select: { id: true } },
        drivers: { select: { id: true } },
      },
    });
    if (!existing) throw new NotFoundException('Document not found');

    const vehicleIds = dto.vehicleIds;
    const driverIds = dto.driverIds;
    if (vehicleIds) await this.assertVehicleIds(companyId, vehicleIds);
    if (driverIds) await this.assertDriverIds(companyId, driverIds);

    const resolvedType = dto.type ?? existing.type;
    const resolvedVehicleIds = vehicleIds ?? existing.vehicles.map(v => v.id);
    const resolvedDriverIds = driverIds ?? existing.drivers.map(d => d.id);
    this.validateDocumentTargets(resolvedType, resolvedVehicleIds, resolvedDriverIds);

    const doc = await this.prisma.fleetDocument.update({
      where: { id },
      data: {
        ...(dto.type ? { type: dto.type } : {}),
        ...(dto.licenseType !== undefined ? { licenseType: dto.licenseType ?? null } : {}),
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

    const impactedVehicleIds = Array.from(
      new Set([...existing.vehicles.map(v => v.id), ...doc.vehicles.map(v => v.id)]),
    );
    const impactedDriverIds = Array.from(
      new Set([...existing.drivers.map(d => d.id), ...doc.drivers.map(d => d.id)]),
    );

    for (const vehicleId of impactedVehicleIds) await this.refreshVehicleDocumentState(companyId, vehicleId);
    for (const driverId of impactedDriverIds) await this.refreshDriverDocumentState(companyId, driverId);

    return doc;
  }

  private async refreshVehicleDocumentState(companyId: string, vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, companyId },
      select: {
        licenseIssuanceDate: true,
        licenseExpiryDate: true,
        insuranceExpiryDate: true,
        insuranceStatus: true,
        inspectionExpiryDate: true,
        mvpiStatus: true,
        operationCardFileUrl: true,
        operationCardIssueDate: true,
        operationCardExpiryDate: true,
        operationCardNumber: true,
      },
    });
    if (!vehicle) return;

    const docs = await this.prisma.fleetDocument.findMany({
      where: {
        companyId,
        type: { in: [...this.vehicleSyncedTypes] },
        vehicles: { some: { id: vehicleId } },
      },
      orderBy: [{ expiryDate: 'desc' }, { updatedAt: 'desc' }],
      select: {
        type: true,
        fileUrl: true,
        issueDate: true,
        expiryDate: true,
        referenceNumber: true,
      },
    });

    const registration = docs.find(d => d.type === 'VEHICLE_REGISTRATION');
    const insurance = docs.find(d => d.type === 'VEHICLE_INSURANCE');
    const inspection = docs.find(d => d.type === 'PERIODIC_INSPECTION');
    const opCard = docs.find(d => d.type === 'OPERATION_CARD');

    await this.prisma.vehicle.updateMany({
      where: { id: vehicleId, companyId },
      data: {
        licenseIssuanceDate: registration ? this.toDateOnly(registration.issueDate) : vehicle.licenseIssuanceDate,
        licenseExpiryDate: registration ? this.toDateOnly(registration.expiryDate) : vehicle.licenseExpiryDate,
        insuranceExpiryDate: insurance ? this.toDateOnly(insurance.expiryDate) : vehicle.insuranceExpiryDate,
        insuranceStatus: insurance ? this.statusFromExpiry(insurance.expiryDate) : vehicle.insuranceStatus,
        inspectionExpiryDate: inspection ? this.toDateOnly(inspection.expiryDate) : vehicle.inspectionExpiryDate,
        mvpiStatus: inspection ? this.statusFromExpiry(inspection.expiryDate) : vehicle.mvpiStatus,
        operationCardFileUrl: opCard ? opCard.fileUrl : vehicle.operationCardFileUrl,
        operationCardIssueDate: opCard ? this.toDateOnly(opCard.issueDate) : vehicle.operationCardIssueDate,
        operationCardExpiryDate: opCard ? this.toDateOnly(opCard.expiryDate) : vehicle.operationCardExpiryDate,
        operationCardNumber: opCard?.referenceNumber ?? vehicle.operationCardNumber,
      },
    });
  }

  private async refreshDriverDocumentState(companyId: string, driverId: string) {
    const licenseDoc = await this.prisma.fleetDocument.findFirst({
      where: {
        companyId,
        type: 'DRIVER_LICENSE',
        drivers: { some: { id: driverId } },
      },
      orderBy: [{ expiryDate: 'desc' }, { updatedAt: 'desc' }],
      select: { expiryDate: true, referenceNumber: true, licenseType: true },
    });

    if (!licenseDoc) return;

    await this.prisma.driver.updateMany({
      where: { id: driverId, companyId },
      data: {
        licenseExpiry: licenseDoc.expiryDate,
        ...(licenseDoc.referenceNumber ? { licenseNumber: licenseDoc.referenceNumber } : {}),
        ...(licenseDoc.licenseType ? { licenseType: licenseDoc.licenseType } : {}),
      },
    });
  }

  private async computeHasReplacement(
    doc: { id: string; type: string; vehicles: { id: string }[]; drivers: { id: string }[] },
    now: Date,
  ): Promise<boolean> {
    const vehicleIds = doc.vehicles.map((v) => v.id);
    const driverIds = doc.drivers.map((d) => d.id);

    if (vehicleIds.length > 0) {
      const count = await this.prisma.fleetDocument.count({
        where: {
          id: { not: doc.id },
          type: doc.type as any,
          expiryDate: { gt: now },
          vehicles: { some: { id: { in: vehicleIds } } },
        },
      });
      if (count > 0) return true;
    }

    if (driverIds.length > 0) {
      const count = await this.prisma.fleetDocument.count({
        where: {
          id: { not: doc.id },
          type: doc.type as any,
          expiryDate: { gt: now },
          drivers: { some: { id: { in: driverIds } } },
        },
      });
      if (count > 0) return true;
    }

    return false;
  }

  async remove(companyId: string, id: string) {
    const existing = await this.prisma.fleetDocument.findFirst({
      where: { id, companyId },
      select: {
        id: true,
        vehicles: { select: { id: true } },
        drivers: { select: { id: true } },
      },
    });
    if (!existing) throw new NotFoundException('Document not found');
    const deleted = await this.prisma.fleetDocument.delete({ where: { id } });
    for (const v of existing.vehicles) await this.refreshVehicleDocumentState(companyId, v.id);
    for (const d of existing.drivers) await this.refreshDriverDocumentState(companyId, d.id);
    return deleted;
  }

  async findAll(companyId: string, query: DocumentsQueryDto) {
    const { page = 1, limit = 20, search, type, status = 'all', vehicleId, driverId, target } = query;
    const skip = (page - 1) * limit;

    const now = new Date();
    const soon = new Date();
    soon.setDate(soon.getDate() + 30);

    const baseWhere: Prisma.FleetDocumentWhereInput = {
      companyId,
      ...(type ? { type } : {}),
      ...(target === 'vehicle' ? { vehicles: { some: {} } } : {}),
      ...(target === 'driver' ? { drivers: { some: {} } } : {}),
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

    const enriched = await Promise.all(
      data.map(async (doc) => {
        const isNonValid = doc.expiryDate <= soon;
        const hasReplacement = isNonValid ? await this.computeHasReplacement(doc, now) : false;
        return { ...doc, hasReplacement };
      }),
    );

    return {
      data: enriched,
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
