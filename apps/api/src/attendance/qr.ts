import { createHmac, timingSafeEqual } from 'crypto';

/** Token lifetime. A screenshot is worthless after two windows. */
export const QR_STEP_MS = 20_000;

export function tokenFor(secret: string, sessionId: string, step: number): string {
  const mac = createHmac('sha256', secret).update(`${sessionId}:${step}`).digest('hex').slice(0, 12);
  return `${step.toString(36)}.${mac}`;
}

export function currentToken(secret: string, sessionId: string, now = Date.now()) {
  const step = Math.floor(now / QR_STEP_MS);
  return {
    token: tokenFor(secret, sessionId, step),
    step,
    expiresAt: new Date((step + 1) * QR_STEP_MS).toISOString(),
  };
}

export interface TokenVerdict {
  ok: boolean;
  reason?: string;
}

export function verifyToken(
  secret: string,
  sessionId: string,
  token: string,
  tolerance = 1,
  now = Date.now(),
): TokenVerdict {
  const [head, mac] = (token ?? '').split('.');
  if (!head || !mac) return { ok: false, reason: 'Malformed QR token' };

  const step = Number.parseInt(head, 36);
  if (!Number.isFinite(step)) return { ok: false, reason: 'Malformed QR token' };

  const drift = Math.abs(Math.floor(now / QR_STEP_MS) - step);
  if (drift > tolerance) return { ok: false, reason: 'QR code expired, scan the live code' };

  const expected = Buffer.from(tokenFor(secret, sessionId, step));
  const given = Buffer.from(token);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    return { ok: false, reason: 'Invalid QR code' };
  }
  return { ok: true };
}

/** Great-circle distance in metres. */
export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
