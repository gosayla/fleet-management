import { Injectable, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { AuthTokenPayload } from '@fleet/shared';
import { ROLES_KEY } from './roles.decorator';

export const IS_PUBLIC_KEY = 'isPublic';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const isAuthenticated = await Promise.resolve(
      super.canActivate(context) as boolean | Promise<boolean>,
    );
    if (!isAuthenticated) return false;

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles?.length) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthTokenPayload | undefined;
    if (!user) return true;

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException('ليس لديك صلاحية للوصول إلى هذا المورد');
    }
    return true;
  }
}
