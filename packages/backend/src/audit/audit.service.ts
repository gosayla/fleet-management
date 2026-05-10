import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction, Prisma } from '@prisma/client';
import { AuditLogsQueryDto } from './audit.dto';

export interface CreateAuditLogParams {
  companyId?: string;
  userId?: string;
  userFullName?: string;
  userRole?: string;
  action: AuditAction;
  entity: string;
  entityId?: string;
  changes?: Record<string, unknown>;
  ipAddress?: string;
  route?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: CreateAuditLogParams): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          companyId: params.companyId,
          userId: params.userId,
          userFullName: params.userFullName,
          userRole: params.userRole,
          action: params.action,
          entity: params.entity,
          entityId: params.entityId,
          changes: params.changes as Prisma.InputJsonValue | undefined,
          ipAddress: params.ipAddress,
          route: params.route,
        },
      });
    } catch {
      // Never let audit logging failures crash the main request
    }
  }

  async findAll(companyId: string, query: AuditLogsQueryDto) {
    const {
      page = 1,
      limit = 50,
      action,
      entity,
      userId,
      from,
      to,
    } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {
      companyId,
      ...(action && { action }),
      ...(entity && { entity }),
      ...(userId && { userId }),
      ...((from || to) && {
        createdAt: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(to) }),
        },
      }),
    };

    const [total, items] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
    ]);

    return {
      data: items,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    };
  }
}
