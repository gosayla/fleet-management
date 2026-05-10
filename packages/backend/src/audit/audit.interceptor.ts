import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request } from 'express';
import { AuditAction } from '@prisma/client';
import { AuthTokenPayload } from '@fleet/shared';
import { AuditService } from './audit.service';

/** Maps URL path segment → entity name for audit logs */
const PATH_TO_ENTITY: Record<string, string> = {
  vehicles: 'Vehicle',
  drivers: 'Driver',
  trips: 'Trip',
  maintenance: 'MaintenanceLog',
  fuel: 'FuelLog',
  documents: 'Document',
  users: 'User',
  rentals: 'VehicleRental',
  contracts: 'TripContract',
  settings: 'Settings',
  'audit-logs': 'AuditLog',
};

/** Maps HTTP method → AuditAction */
const METHOD_TO_ACTION: Record<string, AuditAction> = {
  POST: AuditAction.CREATE,
  PUT: AuditAction.UPDATE,
  PATCH: AuditAction.UPDATE,
  DELETE: AuditAction.DELETE,
};

function extractEntity(path: string): { entity: string; entityId?: string } {
  // path looks like: /api/v1/vehicles/123/... or /api/v1/vehicles
  const segments = path
    .replace(/^\/api\/v1\//, '')
    .split('/')
    .filter(Boolean);

  const segment = segments[0] ?? 'Unknown';
  const entity = PATH_TO_ENTITY[segment] ?? segment;

  // Second segment is typically the entity ID (UUIDs)
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const entityId =
    segments[1] && uuidPattern.test(segments[1]) ? segments[1] : undefined;

  return { entity, entityId };
}

function getClientIp(req: Request): string | undefined {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress;
}

/** Strips sensitive fields from the request body before storing */
function sanitizeBody(body: unknown): Record<string, unknown> | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const SENSITIVE = new Set(['password', 'confirmPassword', 'token', 'secret', 'fcmToken']);
  return Object.fromEntries(
    Object.entries(body as Record<string, unknown>).filter(
      ([key]) => !SENSITIVE.has(key),
    ),
  );
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const method = req.method;
    const action = METHOD_TO_ACTION[method];

    // Only log mutating requests
    if (!action) return next.handle();

    return next.handle().pipe(
      tap(async () => {
        try {
          const user = req.user as AuthTokenPayload | undefined;
          const { entity, entityId } = extractEntity(req.path);
          const changes = sanitizeBody(req.body);

          await this.auditService.log({
            companyId: user?.companyId,
            userId: user?.sub,
            userFullName: user?.fullName,
            userRole: user?.role,
            action,
            entity,
            entityId,
            changes: changes && Object.keys(changes).length > 0 ? changes : undefined,
            ipAddress: getClientIp(req),
            route: `${method} ${req.path}`,
          });
        } catch {
          // Silently ignore — never let audit logging crash a request
        }
      }),
    );
  }
}
