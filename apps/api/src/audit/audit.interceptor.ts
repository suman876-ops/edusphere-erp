import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../common/prisma.service';

const MUTATING = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

/** Fire-and-forget audit trail: who changed what, when, from where. */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest();
    if (!MUTATING.has(req.method)) return next.handle();

    return next.handle().pipe(
      tap((data) => {
        const path = String(req.route?.path ?? req.url ?? '');
        const segments = path.split('/').filter(Boolean);
        const entity = segments[0] ?? 'unknown';
        const payload = (data ?? {}) as { id?: string };
        void this.prisma.auditLog
          .create({
            data: {
              campusId: (req.campusId as string | null) ?? null,
              actorId: (req.user?.sub as string | undefined) ?? null,
              action: `${req.method} ${path}`,
              entity,
              entityId: payload.id ?? null,
              meta: { body: this.redact(req.body) } as Prisma.InputJsonObject,
              ip: req.ip,
            },
          })
          .catch((err: Error) => this.logger.warn(`audit write failed: ${err.message}`));
      }),
    );
  }

  private redact(body: unknown): unknown {
    if (!body || typeof body !== 'object') return body ?? null;
    const clone: Record<string, unknown> = { ...(body as Record<string, unknown>) };
    for (const key of ['password', 'token', 'qrSecret', 'authorization']) {
      if (key in clone) clone[key] = '[redacted]';
    }
    return clone;
  }
}
