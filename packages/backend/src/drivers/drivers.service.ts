import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDriverDto, UpdateDriverDto } from './drivers.dto';
import * as argon2 from 'argon2';

@Injectable()
export class DriversService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string, search?: string) {
    return this.prisma.driver.findMany({
      where: {
        companyId,
        ...(search
          ? {
              OR: [
                { fullName: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
                { nationalId: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: { vehicles: { select: { id: true, plateNumber: true, make: true, model: true, status: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(companyId: string, id: string) {
    const driver = await this.prisma.driver.findFirst({
      where: { id, companyId },
      include: {
        vehicles: { select: { id: true, plateNumber: true, make: true, model: true, status: true } },
        trips: { orderBy: { scheduledStart: 'desc' }, take: 5 },
        documents: {
          include: {
            vehicles: { select: { id: true, plateNumber: true } },
            drivers: { select: { id: true, fullName: true } },
          },
        },
      },
    });
    if (!driver) throw new NotFoundException(`السائق ${id} غير موجود`);
    return driver;
  }

  async uploadPhoto(companyId: string, id: string, filename: string) {
    await this.findOne(companyId, id);
    return this.prisma.driver.update({
      where: { id },
      data: { photoUrl: `/photos/${filename}` },
      select: { id: true, photoUrl: true },
    });
  }

  async create(companyId: string, dto: CreateDriverDto) {
    try {
      return await this.prisma.$transaction(async tx => {
        const normalizedPhone = dto.phone.trim();
        const phoneDigits = normalizedPhone.replace(/\D/g, '');
        const generatedEmail = `driver.${phoneDigits || Date.now().toString()}.${companyId}@fleet.local`;
        const user = await tx.user.create({
          data: {
            companyId,
            email: generatedEmail,
            password: await argon2.hash(normalizedPhone),
            fullName: dto.fullName,
            phone: normalizedPhone,
            role: 'DRIVER',
          },
        });

        return tx.driver.create({
          data: {
            companyId,
            userId: user.id,
            fullName: dto.fullName,
            phone: normalizedPhone,
            nationalId: dto.nationalId,
            licenseNumber: dto.nationalId,
            licenseExpiry: new Date(dto.licenseExpiry),
            bloodType: dto.bloodType,
          },
        });
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        const target = Array.isArray(e?.meta?.target) ? e.meta.target.join(',') : String(e?.meta?.target ?? '');
        if (target.includes('phone')) {
          throw new ConflictException('رقم الجوال مسجل مسبقاً');
        }
        if (target.includes('companyId') && target.includes('nationalId')) {
          throw new ConflictException('رقم الهوية مسجل مسبقاً لهذه الشركة');
        }
        throw new ConflictException('البيانات مسجلة مسبقاً');
      }
      throw e;
    }
  }

  async update(companyId: string, id: string, dto: UpdateDriverDto) {
    await this.findOne(companyId, id);
    const { licenseExpiry, ...rest } = dto;
    return this.prisma.driver.update({
      where: { id },
      data: { ...rest, ...(licenseExpiry ? { licenseExpiry: new Date(licenseExpiry) } : {}) },
    });
  }

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);
    return this.prisma.driver.update({
      where: { id },
      data: { status: 'TERMINATED' },
    });
  }
}
