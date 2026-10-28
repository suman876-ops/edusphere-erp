'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { api, API_URL } from '@/lib/api';

const COOKIE = { httpOnly: true, sameSite: 'lax' as const, path: '/', maxAge: 60 * 60 * 8 };

export async function loginAction(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const next = String(formData.get('next') ?? '/');

  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
    cache: 'no-store',
  });

  if (!res.ok) {
    redirect(`/login?error=${encodeURIComponent('Invalid email or password')}`);
  }

  const body = (await res.json()) as { accessToken: string };
  const store = await cookies();
  store.set('es_token', body.accessToken, COOKIE);
  store.delete('es_campus');
  redirect(next.startsWith('/') ? next : '/');
}

export async function logoutAction() {
  const store = await cookies();
  store.delete('es_token');
  store.delete('es_campus');
  redirect('/login');
}

export async function setCampusAction(formData: FormData) {
  const campusId = String(formData.get('campusId') ?? '');
  const store = await cookies();
  if (campusId) store.set('es_campus', campusId, COOKIE);
  else store.delete('es_campus');
  revalidatePath('/', 'layout');
}

export async function startSessionAction(formData: FormData) {
  const courseId = String(formData.get('courseId') ?? '');
  const sectionId = String(formData.get('sectionId') ?? '');
  const mode = String(formData.get('mode') ?? 'QR');

  const body: Record<string, unknown> = { courseId, sectionId, mode };
  if (mode === 'QR_GEOFENCE') {
    body.lat = 22.5726;
    body.lng = 88.3639;
    body.radiusM = 150;
  }

  const session = await api<{ id: string }>('/attendance/sessions', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  revalidatePath('/attendance');
  redirect(`/attendance/${session.id}`);
}

export async function closeSessionAction(formData: FormData) {
  const id = String(formData.get('sessionId') ?? '');
  await api(`/attendance/sessions/${id}/close`, { method: 'POST' });
  revalidatePath(`/attendance/${id}`);
}

export async function simulateScanAction(formData: FormData) {
  const sessionId = String(formData.get('sessionId') ?? '');
  const studentId = String(formData.get('studentId') ?? '');
  const lat = formData.get('lat');
  const lng = formData.get('lng');

  const qr = await api<{ token: string }>(`/attendance/sessions/${sessionId}/qr`);
  const payload: Record<string, unknown> = {
    token: qr.token,
    studentId,
    deviceId: `console-${studentId.slice(0, 8)}`,
  };
  if (lat && lng) {
    payload.lat = Number(lat);
    payload.lng = Number(lng);
  }

  try {
    await api(`/attendance/sessions/${sessionId}/scan`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  } catch {
    // Surface failures on the page instead of crashing the action.
  }
  revalidatePath(`/attendance/${sessionId}`);
}

export async function recordPaymentAction(formData: FormData) {
  const invoiceId = String(formData.get('invoiceId') ?? '');
  const rupees = Number(formData.get('amount') ?? 0);
  const mode = String(formData.get('mode') ?? 'CASH');

  await api(`/fees/invoices/${invoiceId}/payments`, {
    method: 'POST',
    body: JSON.stringify({ amount: Math.round(rupees * 100), mode }),
  });
  revalidatePath('/fees');
  revalidatePath('/');
}
