import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as admin from 'firebase-admin';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Notifications Service
 * - Checks for expiring documents daily and creates in-app notifications
 * - Sends FCM push via Firebase Admin SDK when user has fcmToken
 * - Checks for upcoming maintenance and fires alerts
 */
@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  private fcmEnabled = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private normalizePrivateKey(raw: string): string {
    let key = String(raw ?? '').trim();

    // Allow wrapping quotes from .env values: "-----BEGIN...-----"
    if (
      (key.startsWith('"') && key.endsWith('"')) ||
      (key.startsWith("'") && key.endsWith("'"))
    ) {
      key = key.slice(1, -1);
    }

    // Common .env format keeps newlines escaped.
    key = key.replace(/\\n/g, '\n').replace(/\r\n/g, '\n');

    // Ensure PEM ends with newline for strict parsers.
    if (key.includes('-----BEGIN PRIVATE KEY-----') && !key.endsWith('\n')) {
      key += '\n';
    }

    return key;
  }

  onModuleInit() {
    const projectId = this.config.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.config.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey = this.normalizePrivateKey(
      this.config.get<string>('FIREBASE_PRIVATE_KEY', ''),
    );

    if (!projectId || !clientEmail || !privateKey || admin.apps.length) {
      this.logger.warn(
        'Firebase env vars missing — FCM push disabled (in-app notifications still work)',
      );
      return;
    }

    try {
      admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      });
      this.fcmEnabled = true;
      this.logger.log('Firebase Admin SDK initialised — FCM push enabled');
    } catch (err) {
      this.fcmEnabled = false;
      this.logger.error(
        `Firebase init failed — FCM push disabled: ${(err as Error).message}`,
      );
    }
  }

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

    // Send FCM push if user has a token and Firebase is configured
    if (this.fcmEnabled) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { fcmToken: true },
      });
      if (user?.fcmToken) {
        try {
          const msgId = await admin.messaging().send({
            token: user.fcmToken,
            notification: { title, body },
            android: { priority: 'high' },
          });
          this.logger.log(`FCM push sent to user ${userId}: messageId=${msgId}`);
        } catch (err) {
          this.logger.error(`FCM send failed for user ${userId}: ${(err as Error).message}`, (err as Error).stack);
        }
      } else {
        this.logger.warn(`FCM skipped for user ${userId}: no fcmToken stored`);
      }
    }
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

  /** Sends a real FCM push + creates a DB notification — used for manual testing */
  async sendTestNotification(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, fcmToken: true },
    });
    if (!user) return { message: 'User not found' };

    await this.createNotification(
      userId,
      '🚀 Test Notification',
      'FCM push is working correctly!',
      'TRIP_STARTED',
    );
    return {
      message: 'Test notification sent',
      targetUser: user.fullName,
      hasFcmToken: !!user.fcmToken,
    };
  }

  /** Returns all users and whether they have an FCM token registered */
  async getFcmStatus() {
    const users = await this.prisma.user.findMany({
      select: { id: true, fullName: true, role: true, fcmToken: true },
      orderBy: { fullName: 'asc' },
    });
    return users.map((u) => ({
      id: u.id,
      name: u.fullName,
      role: u.role,
      hasFcmToken: !!u.fcmToken,
      fcmTokenPreview: u.fcmToken ? u.fcmToken.slice(0, 20) + '…' : null,
    }));
  }
}
