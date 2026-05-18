import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';

// In-memory throttle: only write to DB once per minute per user
const lastWritten = new Map<string, number>();
const THROTTLE_MS = 60_000;

@Injectable()
export class LastSeenInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as { sub?: string } | undefined;

    if (user?.sub) {
      const now = Date.now();
      const last = lastWritten.get(user.sub) ?? 0;
      if (now - last > THROTTLE_MS) {
        lastWritten.set(user.sub, now);
        // Fire-and-forget — do not await to avoid slowing responses
        this.prisma.user
          .update({ where: { id: user.sub }, data: { lastSeenAt: new Date() } })
          .catch(() => undefined);
      }
    }

    return next.handle();
  }
}
