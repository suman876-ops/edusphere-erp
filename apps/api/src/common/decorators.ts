import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Role } from '@prisma/client';

export const IS_PUBLIC = 'es:is_public';
export const ROLES_KEY = 'es:roles';

export interface AuthUser {
  sub: string;
  email: string;
  role: Role;
  campusId: string | null;
  name: string;
}

/** Marks a route as reachable without a bearer token. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** Restricts a route to the given roles. Enforced by the global AuthGuard. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

/** Injects the authenticated user (already verified by the global guard). */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser => {
  const req = ctx.switchToHttp().getRequest();
  return req.user as AuthUser;
});

/**
 * Injects the effective campus scope: a campus uuid, or null for a group-wide
 * (Super Admin) request. Services must fail closed when it is null for
 * campus-owned data.
 */
export const CampusCtx = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | null => {
    const req = ctx.switchToHttp().getRequest();
    return (req.campusId as string | null) ?? null;
  },
);
