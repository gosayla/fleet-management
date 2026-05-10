import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './users.dto';
import { NotificationsService } from '../notifications/notifications.service';

const USER_SELECT = {
  id: true,
  email: true,
  fullName: true,
  phone: true,
  role: true,
  language: true,
  createdAt: true,
} as const;

/** Roles a given requester role is allowed to see and manage */
const MANAGEABLE_ROLES: Partial<Record<UserRole, UserRole[]>> = {
  SUPER_ADMIN:       ['FLEET_MANAGER', 'DISPATCHER', 'DRIVER', 'VIEWER', 'MAINTENANCE_TECH'],
  FLEET_MANAGER:     ['FLEET_MANAGER', 'DISPATCHER', 'DRIVER', 'VIEWER', 'MAINTENANCE_TECH'],
  DISPATCHER:        ['DISPATCHER', 'DRIVER', 'VIEWER', 'MAINTENANCE_TECH'],
  DRIVER:            ['DRIVER', 'VIEWER'],
  VIEWER:            ['VIEWER'],
  MAINTENANCE_TECH:  [],
};

function getManageableRoles(requesterRole: string): UserRole[] {
  return MANAGEABLE_ROLES[requesterRole as UserRole] ?? [];
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

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
    if (!allowed.includes(dto.role as UserRole)) {
      throw new ForbiddenException('لا تملك صلاحية إنشاء مستخدم بهذا الدور');
    }

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('البريد الإلكتروني مسجل مسبقاً');

    const hashed = await argon2.hash(dto.password);
    const created = await this.prisma.user.create({
      data: {
        companyId,
        email: dto.email,
        password: hashed,
        fullName: dto.fullName,
        phone: dto.phone,
        role: dto.role,
        language: dto.language ?? 'ar',
      },
      select: USER_SELECT,
    });
    await this.notificationsService.notifyAccountCreated(created.id, created.role);
    return created;
  }

  async update(companyId: string, id: string, dto: UpdateUserDto, requesterRole: string) {
    const user = await this.prisma.user.findFirst({ where: { id, companyId }, select: { id: true, role: true } });
    if (!user) throw new NotFoundException('المستخدم غير موجود');

    const allowed = getManageableRoles(requesterRole);
    if (!allowed.includes(user.role)) {
      throw new ForbiddenException('لا تملك صلاحية تعديل هذا المستخدم');
    }
    // If the update changes the role, the new role must also be manageable
    if (dto.role && !allowed.includes(dto.role as UserRole)) {
      throw new ForbiddenException('لا تملك صلاحية تعيين هذا الدور');
    }

    const data: Record<string, unknown> = {};
    if (dto.fullName) data.fullName = dto.fullName;
    if (dto.phone) data.phone = dto.phone;
    if (dto.role) data.role = dto.role;
    if (dto.language) data.language = dto.language;
    if (dto.password) data.password = await argon2.hash(dto.password);

    const updated = await this.prisma.user.update({ where: { id }, data, select: USER_SELECT });
    if (dto.role || dto.language || dto.password) {
      await this.notificationsService.notifyAccountUpdated(
        updated.id,
        dto.password ? 'password' : dto.role ? 'role' : 'language',
      );
    }
    return updated;
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
