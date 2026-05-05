import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthTokenPayload } from '@fleet/shared';
import { CreateVehicleDto, UpdateVehicleDto, VehiclesQueryDto } from './vehicles.dto';
import * as xlsx from 'xlsx';

export interface TammVehicleRow {
  plateNumber: string;
  plateType: string | null;
  make: string;
  model: string;
  year: number;
  sequenceNumber: string | null;
  vin: string;
  color: string;
  ownershipDate: string | null;
  licenseExpiryDate: string | null;
  licenseIssuanceDate: string | null;
  inspectionExpiryDate: string | null;
  mvpiStatus: string | null;
  insuranceStatus: string | null;
  insuranceExpiryDate: string | null;
  operationCardNumber: string | null;
  operationCardIssueDate: string | null;
  operationCardExpiryDate: string | null;
  operationCardRenewDate: string | null;
  restrictionStatus: string | null;
  bodyType: string | null;
}

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string, query: VehiclesQueryDto) {
    const {
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      operationCard = 'all',
    } = query;
    const skip = (page - 1) * limit;

    const conditions: Record<string, unknown>[] = [{ companyId }];

    if (search) {
      conditions.push({
        OR: [
          { plateNumber: { contains: search, mode: 'insensitive' as const } },
          { sequenceNumber: { contains: search, mode: 'insensitive' as const } },
          { make: { contains: search, mode: 'insensitive' as const } },
          { model: { contains: search, mode: 'insensitive' as const } },
        ],
      });
    }

    if (operationCard === 'has') {
      conditions.push({
        operationCardNumber: { not: null },
        NOT: { operationCardNumber: '' },
      });
    } else if (operationCard === 'none') {
      conditions.push({
        OR: [{ operationCardNumber: null }, { operationCardNumber: '' }],
      });
    }

    const where = conditions.length === 1 ? conditions[0] : { AND: conditions };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.vehicle.findMany({
        where,
        include: { assignedDriver: true },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.vehicle.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(companyId: string, id: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, companyId },
      include: {
        assignedDriver: true,
        maintenanceLogs: { orderBy: { scheduledDate: 'desc' }, take: 5 },
        fuelLogs: { orderBy: { filledAt: 'desc' }, take: 5 },
        documents: true,
        violations: true,
      },
    });
    if (!vehicle) throw new NotFoundException(`المركبة ${id} غير موجودة`);
    return vehicle;
  }

  async create(companyId: string, dto: CreateVehicleDto) {
    const vehicle = await this.prisma.vehicle.create({
      data: { ...dto, companyId },
    });
    await this.syncOpCardDocument(companyId, vehicle.id, dto);
    return vehicle;
  }

  async update(companyId: string, id: string, dto: UpdateVehicleDto) {
    await this.findOne(companyId, id);
    const vehicle = await this.prisma.vehicle.update({
      where: { id },
      data: dto,
    });
    await this.syncOpCardDocument(companyId, id, dto);
    return vehicle;
  }

  /** Upsert an OPERATION_CARD document when vehicle operation card data is provided */
  private async syncOpCardDocument(
    companyId: string,
    vehicleId: string,
    dto: { operationCardNumber?: string; operationCardIssueDate?: string; operationCardExpiryDate?: string; operationCardRenewDate?: string; operationCardFileUrl?: string },
  ) {
    if (!dto.operationCardIssueDate || !dto.operationCardExpiryDate || !dto.operationCardFileUrl) return;

    const existing = await this.prisma.fleetDocument.findFirst({
      where: { companyId, vehicleId, type: 'OPERATION_CARD' },
      select: { id: true },
    });

    const data = {
      type: 'OPERATION_CARD' as const,
      fileUrl: dto.operationCardFileUrl,
      issueDate: new Date(dto.operationCardIssueDate),
      expiryDate: new Date(dto.operationCardExpiryDate),
      referenceNumber: dto.operationCardNumber ?? null,
    };

    if (existing) {
      await this.prisma.fleetDocument.update({ where: { id: existing.id }, data });
    } else {
      await this.prisma.fleetDocument.create({ data: { ...data, companyId, vehicleId } });
    }
  }

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);
    return this.prisma.vehicle.update({
      where: { id },
      data: { status: 'RETIRED' },
    });
  }

  /** Parse and preview a Tamm-export XLSX without saving to DB */
  parseImportFile(buffer: Buffer): TammVehicleRow[] {
    const wb = xlsx.read(buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: unknown[][] = xlsx.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];

    // Find the header row (contains "Plate Number")
    const headerRowIdx = rows.findIndex(
      (r) => Array.isArray(r) && r.some((c) => typeof c === 'string' && c.includes('Plate Number')),
    );
    if (headerRowIdx === -1) {
      throw new BadRequestException('تنسيق الملف غير صحيح: لم يتم العثور على صف رأس الجدول');
    }

    const headers = rows[headerRowIdx] as string[];
    const dataRows = rows.slice(headerRowIdx + 1).filter((r) => Array.isArray(r) && r.length > 1);

    const col = (name: string) => headers.findIndex((h) => typeof h === 'string' && h.toLowerCase().includes(name.toLowerCase()));
    const colAny = (names: string[]) => headers.findIndex(
      (h) => typeof h === 'string' && names.some((name) => h.toLowerCase().includes(name.toLowerCase())),
    );

    const plateIdx = col('Plate Number');
    const plateTypeIdx = col('Plate Type');
    const makerIdx = col('Vehicle Maker');
    const modelIdx = col('Vehicle Model');
    const yearIdx = col('Model Year');
    const seqIdx = col('Sequence Number');
    const chassisIdx = col('Chassis Number');
    const colorIdx = col('Major Color');
    const ownershipIdx = col('Vehicle ownership date');
    const licExpIdx = col('License Expiry Date');
    const licIssIdx = col('License issuance date');
    const inspIdx = col('Inspection Expiry Date');
    const mvpiIdx = col('MVPI Status');
    const insurIdx = col('Insurance Status');
    const insurExpIdx = col('Insurance Expiry Date');
    const opCardNumberIdx = colAny(['Operation Card Number', 'Card Number']);
    const opCardIssueIdx = colAny(['Operation Card Issue Date', 'Card Issue Date']);
    const opCardExpiryIdx = colAny(['Operation Card Expiry Date', 'Card Expiry Date']);
    const opCardRenewIdx = colAny(['Operation Card Renew Date', 'Card Renew Date']);
    const restrictIdx = col('Restriction Status');
    const bodyTypeIdx = col('Body Type');

    return dataRows.map((r) => {
      const cell = (idx: number) => (idx >= 0 ? r[idx] : undefined);

      return {
        plateNumber: String(cell(plateIdx) ?? '').trim(),
        plateType: String(cell(plateTypeIdx) ?? '').trim() || null,
        make: String(cell(makerIdx) ?? '').trim(),
        model: String(cell(modelIdx) ?? '').trim(),
        year: parseInt(String(cell(yearIdx) ?? '0'), 10) || 0,
        sequenceNumber: String(cell(seqIdx) ?? '').trim() || null,
        vin: String(cell(chassisIdx) ?? '').trim(),
        color: String(cell(colorIdx) ?? '').trim(),
        ownershipDate: this.cleanDate(cell(ownershipIdx)),
        licenseExpiryDate: this.cleanDate(cell(licExpIdx)),
        licenseIssuanceDate: this.cleanDate(cell(licIssIdx)),
        inspectionExpiryDate: this.cleanDate(cell(inspIdx)),
        mvpiStatus: String(cell(mvpiIdx) ?? '').trim() || null,
        insuranceStatus: String(cell(insurIdx) ?? '').trim() || null,
        insuranceExpiryDate: this.cleanDate(cell(insurExpIdx)),
        operationCardNumber: String(cell(opCardNumberIdx) ?? '').trim() || null,
        operationCardIssueDate: this.cleanDate(cell(opCardIssueIdx)),
        operationCardExpiryDate: this.cleanDate(cell(opCardExpiryIdx)),
        operationCardRenewDate: this.cleanDate(cell(opCardRenewIdx)),
        restrictionStatus: String(cell(restrictIdx) ?? '').trim() || null,
        bodyType: String(cell(bodyTypeIdx) ?? '').trim() || null,
      };
    }).filter((v) => v.plateNumber && v.vin);
  }

  private cleanDate(val: unknown): string | null {
    if (val === undefined || val === null) return null;
    const s = String(val).trim();
    if (!s || s === '-') return null;
    return s;
  }

  /** Import vehicles from parsed rows — upsert by VIN */
  async importVehicles(companyId: string, rows: TammVehicleRow[]) {
    let created = 0;
    let updated = 0;

    for (const row of rows) {
      if (!row.vin || !row.plateNumber) continue;

      const existing = await this.prisma.vehicle.findFirst({
        where: { vin: row.vin },
      });

      // Keep existing dates when the import row has empty values.
      // Overwrite only when incoming values are present and changed.
      const ownershipDate = existing
        ? (row.ownershipDate && row.ownershipDate !== existing.ownershipDate
            ? row.ownershipDate
            : existing.ownershipDate)
        : row.ownershipDate;

      const licenseExpiryDate = existing
        ? (row.licenseExpiryDate && row.licenseExpiryDate !== existing.licenseExpiryDate
            ? row.licenseExpiryDate
            : existing.licenseExpiryDate)
        : row.licenseExpiryDate;

      const licenseIssuanceDate = existing
        ? (row.licenseIssuanceDate && row.licenseIssuanceDate !== existing.licenseIssuanceDate
            ? row.licenseIssuanceDate
            : existing.licenseIssuanceDate)
        : row.licenseIssuanceDate;

      const inspectionExpiryDate = existing
        ? (row.inspectionExpiryDate && row.inspectionExpiryDate !== existing.inspectionExpiryDate
            ? row.inspectionExpiryDate
            : existing.inspectionExpiryDate)
        : row.inspectionExpiryDate;

      const insuranceExpiryDate = existing
        ? (row.insuranceExpiryDate && row.insuranceExpiryDate !== existing.insuranceExpiryDate
            ? row.insuranceExpiryDate
            : existing.insuranceExpiryDate)
        : row.insuranceExpiryDate;

      const operationCardNumber = existing
        ? (row.operationCardNumber && row.operationCardNumber !== existing.operationCardNumber
            ? row.operationCardNumber
            : existing.operationCardNumber)
        : row.operationCardNumber;

      const operationCardIssueDate = existing
        ? (row.operationCardIssueDate && row.operationCardIssueDate !== existing.operationCardIssueDate
            ? row.operationCardIssueDate
            : existing.operationCardIssueDate)
        : row.operationCardIssueDate;

      const operationCardExpiryDate = existing
        ? (row.operationCardExpiryDate && row.operationCardExpiryDate !== existing.operationCardExpiryDate
            ? row.operationCardExpiryDate
            : existing.operationCardExpiryDate)
        : row.operationCardExpiryDate;

      const operationCardRenewDate = existing
        ? (row.operationCardRenewDate && row.operationCardRenewDate !== existing.operationCardRenewDate
            ? row.operationCardRenewDate
            : existing.operationCardRenewDate)
        : row.operationCardRenewDate;

      const mvpiStatus = existing
        ? (row.mvpiStatus && row.mvpiStatus !== existing.mvpiStatus
            ? row.mvpiStatus
            : existing.mvpiStatus)
        : row.mvpiStatus;

      const insuranceStatus = existing
        ? (row.insuranceStatus && row.insuranceStatus !== existing.insuranceStatus
            ? row.insuranceStatus
            : existing.insuranceStatus)
        : row.insuranceStatus;

      const restrictionStatus = existing
        ? (row.restrictionStatus && row.restrictionStatus !== existing.restrictionStatus
            ? row.restrictionStatus
            : existing.restrictionStatus)
        : row.restrictionStatus;

      const data = {
        companyId,
        plateNumber: row.plateNumber,
        make: row.make || 'غير محدد',
        model: row.model || 'غير محدد',
        year: row.year || new Date().getFullYear(),
        color: row.color || 'غير محدد',
        type: 'BUS' as const, // default; can be mapped from bodyType
        vin: row.vin,
        plateType: row.plateType,
        sequenceNumber: row.sequenceNumber,
        bodyType: row.bodyType,
        ownershipDate,
        licenseExpiryDate,
        licenseIssuanceDate,
        inspectionExpiryDate,
        mvpiStatus,
        insuranceStatus,
        insuranceExpiryDate,
        operationCardNumber,
        operationCardIssueDate,
        operationCardExpiryDate,
        operationCardRenewDate,
        restrictionStatus,
      };

      if (existing) {
        await this.prisma.vehicle.update({ where: { id: existing.id }, data });
        updated++;
      } else {
        await this.prisma.vehicle.create({ data });
        created++;
      }
    }

    return { created, updated, total: rows.length };
  }
}
