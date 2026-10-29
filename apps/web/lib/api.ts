import { cookies } from 'next/headers';

export { formatINR, formatDate } from './format';

/**
 * The screens still call api('/students') and friends. Those paths now resolve to
 * this app's own route handlers under /api/v1, which run as the signed-in user so
 * RLS applies. Same call shape, one hop fewer than before.
 */
export const API_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const store = await cookies();
  const cookieHeader = store
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json');
  if (cookieHeader) headers.set('cookie', cookieHeader);

  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  });

  if (!res.ok) {
    let message = res.statusText || `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { message?: string | string[] };
      if (body.message) {
        message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
      }
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, message);
  }
  return (await res.json()) as T;
}
