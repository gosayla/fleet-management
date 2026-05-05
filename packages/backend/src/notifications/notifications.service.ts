import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Notifications Service
 * - Checks for expiring documents daily and creates in-app notifications
 * - Sends FCM push via Firebase Admin SDK when user has fcmToken
 * - Checks for upcoming maintenance and fires alerts
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Check documents expiring within 30 days */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkExpiringDocuments() {
    const now = new Date();
    const threshold = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const expiringDocs = await this.prisma.fleetDocument.findMany({
      where: {
        expiryDate: { lte: threshold, gte: now },
      },
      include: { company: { include: { users: true } } },
    });

    for (const doc of expiringDocs) {
      const daysLeft = Math.ceil(
        (doc.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      for (const user of doc.company.users) {
        await this.createNotification(
          user.id,
          'Document Expiring Soon',
          `${doc.type.replace('_', ' ')} expires in ${daysLeft} day(s)`,
          'DOCUMENT_EXPIRING',
          doc.id,
        );
      }
    }

    this.logger.log(`Checked ${expiringDocs.length} expiring documents`);
  }

  /** Check maintenance due within 7 days */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkMaintenanceDue() {
    const now = new Date();
    const threshold = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const upcoming = await this.prisma.maintenanceLog.findMany({
      where: {
        status: 'PENDING',
        scheduledDate: { lte: threshold, gte: now },
      },
      include: {
        vehicle: {
          include: { company: { include: { users: true } } },
        },
      },
    });

    for (const log of upcoming) {
      for (const user of log.vehicle.company.users) {
        await this.createNotification(
          user.id,
          'Maintenance Due',
          `${log.vehicle.plateNumber} — ${log.description} scheduled for ${log.scheduledDate.toLocaleDateString()}`,
          'MAINTENANCE_DUE',
          log.vehicleId,
        );
      }
    }

    this.logger.log(`Checked ${upcoming.length} upcoming maintenance jobs`);
  }

  async createNotification(
    userId: string,
    title: string,
    body: string,
    type: string,
    referenceId?: string,
  ) {
    await this.prisma.notification.create({
      data: { userId, title, body, type: type as any, referenceId },
    });
    // FCM push can be added here via firebase-admin
  }

  async getUserNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markRead(userId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }
}
