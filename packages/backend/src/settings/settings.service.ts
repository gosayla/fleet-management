import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCompanyDto, UpdateProfileDto } from './settings.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCompany(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, crNumber: true, naqlCompanyCode: true, tammSubscriptionId: true, createdAt: true },
    });
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  async updateCompany(companyId: string, dto: UpdateCompanyDto) {
    return this.prisma.company.update({
      where: { id: companyId },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.crNumber ? { crNumber: dto.crNumber } : {}),
        ...(dto.naqlCompanyCode !== undefined ? { naqlCompanyCode: dto.naqlCompanyCode || null } : {}),
        ...(dto.tammSubscriptionId !== undefined ? { tammSubscriptionId: dto.tammSubscriptionId || null } : {}),
      },
      select: { id: true, name: true, crNumber: true, naqlCompanyCode: true, tammSubscriptionId: true },
    });
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, fullName: true, phone: true, role: true, createdAt: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const data: Record<string, unknown> = {};

    if (dto.fullName) data.fullName = dto.fullName;
    if (dto.phone) data.phone = dto.phone;

    if (dto.newPassword) {
      if (!dto.currentPassword) {
        throw new BadRequestException('Current password is required to set a new one');
      }
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { password: true } });
      const valid = user && await argon2.verify(user.password, dto.currentPassword);
      if (!valid) throw new BadRequestException('Current password is incorrect');
      data.password = await argon2.hash(dto.newPassword);
    }

    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, email: true, fullName: true, phone: true, role: true },
    });
  }
}
