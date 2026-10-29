import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ statusCode: status, message, error: message, ...extra }, { status });
}

/**
 * Same error envelope the old NestJS API returned, so the parity harness and any
 * client code keep working unchanged.
 */
export function handle(error: unknown) {
  if (error instanceof ZodError) {
    return fail(error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '), 400);
  }
  const e = error as { message?: string; code?: string };
  const message = e?.message ?? 'Unexpected error';
  if (e?.code === '42501') return fail(message, 403);
  if (e?.code === 'P0002') return fail(message, 404);
  if (e?.code === '23514' || e?.code === '23505' || e?.code === '23503') return fail(message, 400);
  return fail(message, 500);
}
