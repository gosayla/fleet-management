import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './auth.dto';
import { AuthTokenPayload } from '@fleet/shared';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

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
      },
    });

    const token = await this.signToken(user.id, user.email ?? '', user.role, user.companyId);

    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        companyId: user.companyId,
      },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (!user) {
      throw new UnauthorizedException('بيانات تسجيل الدخول غير صحيحة');
    }

    const valid = await argon2.verify(user.password, dto.password);
    if (!valid) {
      throw new UnauthorizedException('بيانات تسجيل الدخول غير صحيحة');
    }

    const token = await this.signToken(user.id, user.email ?? '', user.role, user.companyId);

    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        companyId: user.companyId,
      },
    };
  }

  async updateFcmToken(userId: string, fcmToken: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { fcmToken },
    });
  }

  private async signToken(
    userId: string,
    email: string,
    role: string,
    companyId: string,
  ): Promise<string> {
    const payload: AuthTokenPayload = {
      sub: userId,
      email,
      role: role as AuthTokenPayload['role'],
      companyId,
    };
    return this.jwt.signAsync(payload, {
      expiresIn: this.config.get('JWT_EXPIRES_IN', '7d'),
      secret: this.config.get('JWT_SECRET'),
    });
  }
}
