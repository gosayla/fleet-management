import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto, ResetPasswordDto } from './auth.dto';
import { AuthTokenPayload } from '@fleet/shared';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private serializeUser(user: {
    id: string;
    email: string | null;
    fullName: string;
    phone: string;
    role: string;
    companyId: string;
    language: string;
    company?: { name: string } | null;
  }) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      role: user.role,
      companyId: user.companyId,
      companyName: user.company?.name ?? null,
      language: user.language,
    };
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('البريد الإلكتروني مسجل مسبقاً');
    }

    const hashed = await argon2.hash(dto.password);

    const company = await this.prisma.company.create({
      data: {
        name: dto.companyName,
        crNumber: dto.crNumber,
      },
    });

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashed,
        fullName: dto.fullName,
        phone: dto.phone,
        role: 'FLEET_MANAGER',
        companyId: company.id,
        language: dto.language ?? 'ar',
      },
      include: { company: { select: { name: true } } },
    });

    const token = await this.signToken(user.id, user.email ?? '', user.role, user.companyId, user.fullName);

    return {
      accessToken: token,
      user: {
        ...this.serializeUser(user),
      },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
      include: { company: { select: { name: true } } },
    });
    if (!user) {
      throw new UnauthorizedException('بيانات تسجيل الدخول غير صحيحة');
    }

    const valid = await argon2.verify(user.password, dto.password);
    if (!valid) {
      throw new UnauthorizedException('بيانات تسجيل الدخول غير صحيحة');
    }

    const token = await this.signToken(user.id, user.email ?? '', user.role, user.companyId, user.fullName);

    return {
      accessToken: token,
      user: {
        ...this.serializeUser(user),
      },
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const identifier = dto.identifier.trim();
    const crNumber = dto.crNumber.trim();
    const isEmail = identifier.includes('@');

    const user = await this.prisma.user.findFirst({
      where: {
        ...(isEmail
          ? { email: { equals: identifier, mode: 'insensitive' } }
          : { phone: identifier }),
        role: { in: ['SUPER_ADMIN', 'FLEET_MANAGER', 'DISPATCHER', 'VIEWER'] },
        company: { crNumber },
      },
      select: { id: true },
    });

    if (!user) {
      throw new UnauthorizedException('بيانات التحقق غير صحيحة');
    }

    const hashed = await argon2.hash(dto.newPassword);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashed },
    });

    await this.notificationsService.notifyPasswordUpdated(user.id);

    return { message: 'تم تحديث كلمة المرور بنجاح' };
  }

  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        companyId: true,
        language: true,
        company: { select: { name: true } },
      },
    });
    return user ? this.serializeUser(user) : null;
  }

  async updateFcmToken(userId: string, fcmToken: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { fcmToken },
    });
  }

  async updateLanguage(userId: string, language: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { language },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        companyId: true,
        language: true,
        company: { select: { name: true } },
      },
    });
    return this.serializeUser(user);
  }

  private async signToken(
    userId: string,
    email: string,
    role: string,
    companyId: string,
    fullName?: string,
  ): Promise<string> {
    const payload: AuthTokenPayload = {
      sub: userId,
      email,
      role: role as AuthTokenPayload['role'],
      companyId,
      fullName,
    };
    return this.jwt.signAsync(payload, {
      expiresIn: this.config.get('JWT_EXPIRES_IN', '7d'),
      secret: this.config.get('JWT_SECRET'),
    });
  }
}
