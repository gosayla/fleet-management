import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './users.dto';

const USER_SELECT = {
  id: true,
  email: true,
  fullName: true,
  phone: true,
  role: true,
  createdAt: true,
} as const;

/** Roles a given requester role is allowed to see and manage */
const MANAGEABLE_ROLES: Record<string, string[]> = {
  SUPER_ADMIN:    ['FLEET_MANAGER', 'DISPATCHER', 'DRIVER', 'VIEWER'],
  FLEET_MANAGER:  ['FLEET_MANAGER', 'DISPATCHER', 'DRIVER', 'VIEWER'],
  DISPATCHER:     ['DISPATCHER', 'DRIVER', 'VIEWER'],
  DRIVER:         ['DRIVER', 'VIEWER'],
  VIEWER:         ['VIEWER'],
};

function getManageableRoles(requesterRole: string): string[] {
  return MANAGEABLE_ROLES[requesterRole] ?? [];
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string, requesterRole: string) {
    const allowed = getManageableRoles(requesterRole);
    return this.prisma.user.findMany({
      where: { companyId, role: { in: allowed } },
      select: USER_SELECT,
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(companyId: string, dto: CreateUserDto, requesterRole: string) {
    const allowed = getManageableRoles(requesterRole);
    if (!allowed.includes(dto.role)) {
      throw new ForbiddenException('لا تملك صلاحية إنشاء مستخدم بهذا الدور');
    }

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('البريد الإلكتروني مسجل مسبقاً');

    const hashed = await argon2.hash(dto.password);
    return this.prisma.user.create({
      data: {
        companyId,
        email: dto.email,
        password: hashed,
        fullName: dto.fullName,
        phone: dto.phone,
        role: dto.role,
      },
      select: USER_SELECT,
    });
  }

  async update(companyId: string, id: string, dto: UpdateUserDto, requesterRole: string) {
    const user = await this.prisma.user.findFirst({ where: { id, companyId }, select: { id: true, role: true } });
    if (!user) throw new NotFoundException('المستخدم غير موجود');

    const allowed = getManageableRoles(requesterRole);
    if (!allowed.includes(user.role)) {
      throw new ForbiddenException('لا تملك صلاحية تعديل هذا المستخدم');
    }
    // If the update changes the role, the new role must also be manageable
    if (dto.role && !allowed.includes(dto.role)) {
      throw new ForbiddenException('لا تملك صلاحية تعيين هذا الدور');
    }

    const data: Record<string, unknown> = {};
    if (dto.fullName) data.fullName = dto.fullName;
    if (dto.phone) data.phone = dto.phone;
    if (dto.role) data.role = dto.role;
    if (dto.password) data.password = await argon2.hash(dto.password);

    return this.prisma.user.update({ where: { id }, data, select: USER_SELECT });
  }

  async remove(companyId: string, id: string, selfId: string, requesterRole: string) {
    if (id === selfId) throw new BadRequestException('لا يمكنك حذف حسابك الخاص');

    const user = await this.prisma.user.findFirst({ where: { id, companyId }, select: { id: true, role: true } });
    if (!user) throw new NotFoundException('المستخدم غير موجود');

    const allowed = getManageableRoles(requesterRole);
    if (!allowed.includes(user.role)) {
      throw new ForbiddenException('لا تملك صلاحية حذف هذا المستخدم');
    }

    await this.prisma.user.delete({ where: { id } });
    return { deleted: true };
  }
}
