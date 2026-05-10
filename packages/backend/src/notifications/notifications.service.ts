import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as admin from 'firebase-admin';
import { PrismaService } from '../prisma/prisma.service';

type PreferredLanguage = 'ar' | 'en' | 'hi' | 'bn' | 'ur';
type NotificationMessage = { title: string; body: string };
type StoredUser = { id: string; language: string; fcmToken: string | null };

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly operationsRoles = ['FLEET_MANAGER', 'DISPATCHER'] as const;
  private fcmEnabled = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private normalizePrivateKey(raw: string): string {
    let key = String(raw ?? '').trim();

    if (
      (key.startsWith('"') && key.endsWith('"')) ||
      (key.startsWith("'") && key.endsWith("'"))
    ) {
      key = key.slice(1, -1);
    }

    key = key.replace(/\\n/g, '\n').replace(/\r\n/g, '\n');

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

  private resolveLanguage(language?: string | null): PreferredLanguage {
    if (language === 'en' || language === 'hi' || language === 'bn' || language === 'ur') {
      return language;
    }
    return 'ar';
  }

  private async getCompanyOpsUsers(companyId: string): Promise<StoredUser[]> {
    return this.prisma.user.findMany({
      where: { companyId, role: { in: [...this.operationsRoles] } },
      select: { id: true, language: true, fcmToken: true },
    });
  }

  private async getDriverUsers(driverIds: string[]): Promise<StoredUser[]> {
    if (!driverIds.length) return [];

    const drivers = await this.prisma.driver.findMany({
      where: { id: { in: driverIds }, userId: { not: null } },
      select: { userId: true },
    });
    const userIds = drivers.map((driver) => driver.userId).filter(Boolean) as string[];
    if (!userIds.length) return [];

    return this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, language: true, fcmToken: true },
    });
  }

  private uniqUsers(users: StoredUser[]): StoredUser[] {
    return [...new Map(users.map((user) => [user.id, user])).values()];
  }

  private async sendPush(user: StoredUser, title: string, body: string, data?: Record<string, string>) {
    if (!this.fcmEnabled || !user.fcmToken) return;

    try {
      const msgId = await admin.messaging().send({
        token: user.fcmToken,
        notification: { title, body },
        android: { priority: 'high' },
        ...(data ? { data } : {}),
      });
      this.logger.log(`FCM push sent to user ${user.id}: messageId=${msgId}`);
    } catch (err) {
      this.logger.error(
        `FCM send failed for user ${user.id}: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }

  private async createNotificationRecord(
    user: StoredUser,
    message: NotificationMessage,
    type: string,
    referenceId?: string,
    dedupeHours = 24,
  ) {
    const existing = await this.prisma.notification.findFirst({
      where: {
        userId: user.id,
        type: type as any,
        referenceId: referenceId ?? null,
        title: message.title,
        body: message.body,
        createdAt: {
          gte: new Date(Date.now() - dedupeHours * 60 * 60 * 1000),
        },
      },
      select: { id: true },
    });

    if (existing) return existing;

    const created = await this.prisma.notification.create({
      data: {
        userId: user.id,
        title: message.title,
        body: message.body,
        type: type as any,
        referenceId,
      },
    });

    await this.sendPush(user, message.title, message.body, {
      notificationType: type,
      referenceId: referenceId ?? '',
    });
    return created;
  }

  private async notifyUsers(
    users: StoredUser[],
    type: string,
    referenceId: string | undefined,
    buildMessage: (language: PreferredLanguage) => NotificationMessage,
    dedupeHours = 24,
  ) {
    for (const user of this.uniqUsers(users)) {
      await this.createNotificationRecord(
        user,
        buildMessage(this.resolveLanguage(user.language)),
        type,
        referenceId,
        dedupeHours,
      );
    }
  }

  private docTypeLabel(type: string, language: PreferredLanguage) {
    const labels: Record<string, Record<PreferredLanguage, string>> = {
      DRIVER_LICENSE: {
        ar: 'رخصة القيادة',
        en: 'Driver License',
        hi: 'ड्राइविंग लाइसेंस',
        bn: 'ড্রাইভিং লাইসেন্স',
        ur: 'ڈرائیونگ لائسنس',
      },
      VEHICLE_INSURANCE: {
        ar: 'تأمين المركبة',
        en: 'Vehicle Insurance',
        hi: 'वाहन बीमा',
        bn: 'যানবাহন বীমা',
        ur: 'گاڑی کا انشورنس',
      },
      PERIODIC_INSPECTION: {
        ar: 'الفحص الدوري',
        en: 'Periodic Inspection',
        hi: 'आवधिक निरीक्षण',
        bn: 'পর্যায়ক্রমিক পরিদর্শন',
        ur: 'مدت وار معائنہ',
      },
      VEHICLE_REGISTRATION: {
        ar: 'تسجيل المركبة',
        en: 'Vehicle Registration',
        hi: 'वाहन पंजीकरण',
        bn: 'যানবাহন নিবন্ধন',
        ur: 'گاڑی رجسٹریشن',
      },
      OPERATION_CARD: {
        ar: 'بطاقة التشغيل',
        en: 'Operation Card',
        hi: 'ऑपरेशन कार्ड',
        bn: 'অপারেশন কার্ড',
        ur: 'آپریشن کارڈ',
      },
      TRANSPORT_PERMIT: {
        ar: 'تصريح النقل',
        en: 'Transport Permit',
        hi: 'परिवहन परमिट',
        bn: 'পরিবহন পারমিট',
        ur: 'ٹرانسپورٹ پرمٹ',
      },
      OWNERSHIP_DEED: {
        ar: 'سند الملكية',
        en: 'Ownership Deed',
        hi: 'स्वामित्व दस्तावेज़',
        bn: 'মালিকানার দলিল',
        ur: 'ملکیت کی دستاویز',
      },
    };

    return labels[type]?.[language] ?? type.replace(/_/g, ' ');
  }

  private documentExpiringMessage(
    language: PreferredLanguage,
    documentType: string,
    daysLeft: number,
    plateNumbers: string[],
  ): NotificationMessage {
    const documentLabel = this.docTypeLabel(documentType, language);
    const plate = plateNumbers.length > 0 ? ` (${plateNumbers.join(', ')})` : '';
    switch (language) {
      case 'en':
        return { title: 'Document Expiring Soon', body: `${documentLabel}${plate} expires in ${daysLeft} day(s)` };
      case 'hi':
        return { title: 'दस्तावेज़ जल्द समाप्त होगा', body: `${documentLabel}${plate} ${daysLeft} दिन में समाप्त होगा` };
      case 'bn':
        return { title: 'ডকুমেন্টের মেয়াদ শীঘ্রই শেষ হবে', body: `${documentLabel}${plate} ${daysLeft} দিনের মধ্যে শেষ হবে` };
      case 'ur':
        return { title: 'دستاویز جلد ختم ہونے والی ہے', body: `${documentLabel}${plate} ${daysLeft} دن میں ختم ہو جائے گی` };
      default:
        return { title: 'مستند على وشك الانتهاء', body: `ستنتهي صلاحية ${documentLabel}${plate} خلال ${daysLeft} يوم` };
    }
  }

  private maintenanceDueMessage(
    language: PreferredLanguage,
    plateNumber: string,
    description: string,
    scheduledDate: Date,
  ): NotificationMessage {
    const date = scheduledDate.toLocaleDateString();
    switch (language) {
      case 'en':
        return { title: 'Maintenance Due', body: `${plateNumber} — ${description} scheduled for ${date}` };
      case 'hi':
        return { title: 'रखरखाव देय है', body: `${plateNumber} — ${description} ${date} के लिए निर्धारित है` };
      case 'bn':
        return { title: 'রক্ষণাবেক্ষণের সময় হয়েছে', body: `${plateNumber} — ${description} ${date} তারিখে নির্ধারিত` };
      case 'ur':
        return { title: 'مینٹیننس مقرر ہے', body: `${plateNumber} — ${description} ${date} کے لیے مقرر ہے` };
      default:
        return { title: 'موعد صيانة قريب', body: `${plateNumber} — ${description} مجدولة بتاريخ ${date}` };
    }
  }

  private vehicleAssignedMessage(language: PreferredLanguage, plateNumber: string): NotificationMessage {
    switch (language) {
      case 'en':
        return { title: 'Vehicle Assigned', body: `You were assigned to vehicle ${plateNumber}` };
      case 'hi':
        return { title: 'वाहन असाइन किया गया', body: `आपको वाहन ${plateNumber} सौंपा गया है` };
      case 'bn':
        return { title: 'গাড়ি বরাদ্দ করা হয়েছে', body: `আপনাকে ${plateNumber} গাড়িটি বরাদ্দ করা হয়েছে` };
      case 'ur':
        return { title: 'گاڑی تفویض کر دی گئی', body: `آپ کو گاڑی ${plateNumber} تفویض کی گئی ہے` };
      default:
        return { title: 'تم تعيين مركبة لك', body: `تم تعيين المركبة ${plateNumber} لك` };
    }
  }

  private tripAssignedMessage(
    language: PreferredLanguage,
    origin: string,
    destination: string,
    scheduledStart: Date,
  ): NotificationMessage {
    const date = scheduledStart.toLocaleString();
    switch (language) {
      case 'en':
        return { title: 'Trip Assigned', body: `${origin} -> ${destination} on ${date}` };
      case 'hi':
        return { title: 'यात्रा असाइन की गई', body: `${origin} -> ${destination} ${date} पर` };
      case 'bn':
        return { title: 'ট্রিপ বরাদ্দ করা হয়েছে', body: `${origin} -> ${destination}, ${date}` };
      case 'ur':
        return { title: 'سفر تفویض کیا گیا', body: `${origin} -> ${destination}، ${date}` };
      default:
        return { title: 'تم تعيين رحلة لك', body: `${origin} -> ${destination} بتاريخ ${date}` };
    }
  }

  private tripStatusMessage(
    language: PreferredLanguage,
    status: 'IN_PROGRESS' | 'COMPLETED',
    tripName: string,
  ): NotificationMessage {
    if (status === 'IN_PROGRESS') {
      switch (language) {
        case 'en':
          return { title: 'Trip Started', body: `${tripName} has started` };
        case 'hi':
          return { title: 'यात्रा शुरू हुई', body: `${tripName} शुरू हो गई है` };
        case 'bn':
          return { title: 'ট্রিপ শুরু হয়েছে', body: `${tripName} শুরু হয়েছে` };
        case 'ur':
          return { title: 'سفر شروع ہو گیا', body: `${tripName} شروع ہو گیا ہے` };
        default:
          return { title: 'بدأت الرحلة', body: `تم بدء ${tripName}` };
      }
    }

    switch (language) {
      case 'en':
        return { title: 'Trip Completed', body: `${tripName} was completed` };
      case 'hi':
        return { title: 'यात्रा पूरी हुई', body: `${tripName} पूरी हो गई` };
      case 'bn':
        return { title: 'ট্রিপ সম্পন্ন হয়েছে', body: `${tripName} সম্পন্ন হয়েছে` };
      case 'ur':
        return { title: 'سفر مکمل ہو گیا', body: `${tripName} مکمل ہو گیا ہے` };
      default:
        return { title: 'اكتملت الرحلة', body: `تم إكمال ${tripName}` };
    }
  }

  private accountMessage(
    language: PreferredLanguage,
    event: 'created' | 'updated' | 'password' | 'role',
    role?: string,
  ): NotificationMessage {
    switch (event) {
      case 'created':
        switch (language) {
          case 'en':
            return { title: 'Account Created', body: `Your account is ready${role ? ` as ${role.replace(/_/g, ' ')}` : ''}` };
          case 'hi':
            return { title: 'खाता बनाया गया', body: `आपका खाता तैयार है${role ? ` (${role.replace(/_/g, ' ')})` : ''}` };
          case 'bn':
            return { title: 'অ্যাকাউন্ট তৈরি হয়েছে', body: `আপনার অ্যাকাউন্ট প্রস্তুত${role ? ` (${role.replace(/_/g, ' ')})` : ''}` };
          case 'ur':
            return { title: 'اکاؤنٹ بنا دیا گیا', body: `آپ کا اکاؤنٹ تیار ہے${role ? ` (${role.replace(/_/g, ' ')})` : ''}` };
          default:
            return { title: 'تم إنشاء الحساب', body: `حسابك جاهز${role ? ` بدور ${role.replace(/_/g, ' ')}` : ''}` };
        }
      case 'password':
        switch (language) {
          case 'en':
            return { title: 'Account Updated', body: 'Your password was updated' };
          case 'hi':
            return { title: 'खाता अपडेट हुआ', body: 'आपका पासवर्ड अपडेट किया गया' };
          case 'bn':
            return { title: 'অ্যাকাউন্ট আপডেট হয়েছে', body: 'আপনার পাসওয়ার্ড আপডেট করা হয়েছে' };
          case 'ur':
            return { title: 'اکاؤنٹ اپڈیٹ ہوا', body: 'آپ کا پاس ورڈ اپڈیٹ کر دیا گیا' };
          default:
            return { title: 'تم تحديث الحساب', body: 'تم تحديث كلمة المرور الخاصة بك' };
        }
      case 'role':
        switch (language) {
          case 'en':
            return { title: 'Account Updated', body: 'Your role or access was updated' };
          case 'hi':
            return { title: 'खाता अपडेट हुआ', body: 'आपकी भूमिका या अनुमति अपडेट की गई' };
          case 'bn':
            return { title: 'অ্যাকাউন্ট আপডেট হয়েছে', body: 'আপনার ভূমিকা বা অনুমতি আপডেট হয়েছে' };
          case 'ur':
            return { title: 'اکاؤنٹ اپڈیٹ ہوا', body: 'آپ کا کردار یا رسائی اپڈیٹ کر دی گئی' };
          default:
            return { title: 'تم تحديث الحساب', body: 'تم تحديث الدور أو الصلاحيات الخاصة بك' };
        }
      default:
        switch (language) {
          case 'en':
            return { title: 'Account Updated', body: 'Your account preferences were updated' };
          case 'hi':
            return { title: 'खाता अपडेट हुआ', body: 'आपकी खाता सेटिंग्स अपडेट की गईं' };
          case 'bn':
            return { title: 'অ্যাকাউন্ট আপডেট হয়েছে', body: 'আপনার অ্যাকাউন্ট সেটিংস আপডেট করা হয়েছে' };
          case 'ur':
            return { title: 'اکاؤنٹ اپڈیٹ ہوا', body: 'آپ کی اکاؤنٹ سیٹنگز اپڈیٹ کر دی گئی ہیں' };
          default:
            return { title: 'تم تحديث الحساب', body: 'تم تحديث إعدادات حسابك' };
        }
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkExpiringDocuments() {
    const now = new Date();
    const threshold = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const expiringDocs = await this.prisma.fleetDocument.findMany({
      where: { expiryDate: { lte: threshold, gte: now } },
      include: {
        drivers: { select: { id: true } },
        vehicles: { select: { plateNumber: true } },
      },
    });

    for (const doc of expiringDocs) {
      const daysLeft = Math.ceil(
        (doc.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      const plateNumbers = doc.vehicles.map(v => v.plateNumber);
      const opsUsers = await this.getCompanyOpsUsers(doc.companyId);
      const driverUsers = doc.type === 'DRIVER_LICENSE'
        ? await this.getDriverUsers(doc.drivers.map((driver) => driver.id))
        : [];

      await this.notifyUsers(
        [...opsUsers, ...driverUsers],
        'DOCUMENT_EXPIRING',
        doc.id,
        (language) => this.documentExpiringMessage(language, doc.type, daysLeft, plateNumbers),
      );
    }

    this.logger.log(`Checked ${expiringDocs.length} expiring documents`);
  }

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkMaintenanceDue() {
    const now = new Date();
    const threshold = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const upcoming = await this.prisma.maintenanceLog.findMany({
      where: {
        status: 'PENDING',
        scheduledDate: { lte: threshold, gte: now },
      },
      include: { vehicle: true },
    });

    for (const log of upcoming) {
      const users = await this.getCompanyOpsUsers(log.vehicle.companyId);
      await this.notifyUsers(
        users,
        'MAINTENANCE_DUE',
        log.vehicleId,
        (language) =>
          this.maintenanceDueMessage(
            language,
            log.vehicle.plateNumber,
            log.description ?? 'Maintenance',
            log.scheduledDate,
          ),
      );
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
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, language: true, fcmToken: true },
    });
    if (!user) return null;

    return this.createNotificationRecord(user, { title, body }, type, referenceId);
  }

  async notifyVehicleAssigned(_companyId: string, driverId: string, plateNumber: string) {
    const users = await this.getDriverUsers([driverId]);
    await this.notifyUsers(
      users,
      'VEHICLE_ASSIGNED',
      driverId,
      (language) => this.vehicleAssignedMessage(language, plateNumber),
    );
  }

  async notifyTripAssigned(companyId: string, tripId: string) {
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, companyId },
      select: {
        id: true,
        origin: true,
        destination: true,
        scheduledStart: true,
        driverId: true,
      },
    });
    if (!trip?.driverId) return;

    const users = await this.getDriverUsers([trip.driverId]);
    await this.notifyUsers(
      users,
      'TRIP_ASSIGNED',
      trip.id,
      (language) =>
        this.tripAssignedMessage(
          language,
          trip.origin,
          trip.destination,
          trip.scheduledStart,
        ),
    );
  }

  async notifyTripStatus(companyId: string, tripId: string, status: 'IN_PROGRESS' | 'COMPLETED') {
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, companyId },
      select: { id: true, origin: true, destination: true },
    });
    if (!trip) return;

    const users = await this.getCompanyOpsUsers(companyId);
    const tripName = `${trip.origin} -> ${trip.destination}`;
    await this.notifyUsers(
      users,
      status === 'IN_PROGRESS' ? 'TRIP_STARTED' : 'TRIP_COMPLETED',
      trip.id,
      (language) => this.tripStatusMessage(language, status, tripName),
    );
  }

  async notifyAccountCreated(userId: string, role: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, language: true, fcmToken: true },
    });
    if (!user) return;

    await this.createNotificationRecord(
      user,
      this.accountMessage(this.resolveLanguage(user.language), 'created', role),
      'ACCOUNT_UPDATED',
      userId,
      1,
    );
  }

  async notifyAccountUpdated(userId: string, change: 'language' | 'role' | 'password') {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, language: true, fcmToken: true },
    });
    if (!user) return;

    await this.createNotificationRecord(
      user,
      this.accountMessage(
        this.resolveLanguage(user.language),
        change === 'password' ? 'password' : change === 'role' ? 'role' : 'updated',
      ),
      'ACCOUNT_UPDATED',
      userId,
      1,
    );
  }

  async notifyPasswordUpdated(userId: string) {
    await this.notifyAccountUpdated(userId, 'password');
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

  async sendTestNotification(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, fcmToken: true },
    });
    if (!user) return { message: 'User not found' };

    await this.createNotification(
      userId,
      'Test Notification',
      'FCM push is working correctly!',
      'TRIP_STARTED',
    );
    return {
      message: 'Test notification sent',
      targetUser: user.fullName,
      hasFcmToken: !!user.fcmToken,
    };
  }

  async getFcmStatus() {
    const users = await this.prisma.user.findMany({
      select: { id: true, fullName: true, role: true, fcmToken: true, language: true },
      orderBy: { fullName: 'asc' },
    });
    return users.map((user) => ({
      id: user.id,
      name: user.fullName,
      role: user.role,
      language: user.language,
      hasFcmToken: !!user.fcmToken,
      fcmTokenPreview: user.fcmToken ? `${user.fcmToken.slice(0, 20)}…` : null,
    }));
  }
}
