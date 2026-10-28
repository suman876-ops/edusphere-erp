import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Role } from '@prisma/client';
import { AuthUser, IS_PUBLIC, ROLES_KEY } from './decorators';

/**
 * One global guard does three jobs in a fixed order:
 *   1. verify the JWT (unless the route is @Public)
 *   2. resolve the tenant scope  -> req.campusId
 *   3. enforce @Roles metadata
 * Keeping them together makes the order impossible to get wrong.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const targets = [ctx.getHandler(), ctx.getClass()];
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets);

    if (!isPublic) {
      const header: string | undefined = req.headers.authorization;
      if (!header?.startsWith('Bearer ')) {
        throw new UnauthorizedException('Missing bearer token');
      }
      try {
        req.user = await this.jwt.verifyAsync<AuthUser>(header.slice(7));
      } catch {
        throw new UnauthorizedException('Invalid or expired token');
      }
    }

    const user = req.user as AuthUser | undefined;
    if (user) {
      const headerCampus = (req.headers['x-campus-id'] as string | undefined) || undefined;
      if (user.role === 'SA') {
        req.campusId = headerCampus ?? user.campusId ?? null;
      } else {
        if (headerCampus && headerCampus !== user.campusId) {
          throw new ForbiddenException('Campus scope violation');
        }
        req.campusId = user.campusId ?? null;
      }
    }

    const roles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, targets);
    if (roles?.length) {
      if (!user || !roles.includes(user.role)) {
        throw new ForbiddenException(`Requires role: ${roles.join(', ')}`);
      }
    }
    return true;
  }
}
