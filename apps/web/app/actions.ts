'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { api } from '@/lib/api';

/** Only the active-campus hint lives in a cookie now. Identity is Supabase Auth. */
const CAMPUS_COOKIE = { httpOnly: true, sameSite: 'lax' as const, path: '/', maxAge: 60 * 60 * 8 };

export async function loginAction(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const next = String(formData.get('next') ?? '/');

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent('Invalid email or password')}`);
  }

  const store = await cookies();
  store.delete('es_campus');
  redirect(next.startsWith('/') ? next : '/');
}

export async function logoutAction() {
  const supabase = await createClient();
  // revokes the session server-side, unlike deleting a cookie
  await supabase.auth.signOut();

  const store = await cookies();
  store.delete('es_campus');
  redirect('/login');
}

export async function setCampusAction(formData: FormData) {
  const campusId = String(formData.get('campusId') ?? '');
  const store = await cookies();
  if (campusId) store.set('es_campus', campusId, CAMPUS_COOKIE);
  else store.delete('es_campus');
  revalidatePath('/', 'layout');
}

export async function startSessionAction(formData: FormData) {
  const courseId = String(formData.get('courseId') ?? '');
  const sectionId = String(formData.get('sectionId') ?? '');
  const mode = String(formData.get('mode') ?? 'qr');

  const body: Record<string, unknown> = { courseId, sectionId, mode };
  if (mode.toLowerCase() === 'qr_geo') {
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
  const lat = formData.get('lat');
  const lng = formData.get('lng');

  const qr = await api<{ token: string }>(`/attendance/sessions/${sessionId}/qr`);
  await api(`/attendance/sessions/${sessionId}/scan`, {
    method: 'POST',
    body: JSON.stringify({
      token: qr.token,
      lat: lat ? Number(lat) : 22.5726,
      lng: lng ? Number(lng) : 88.3639,
      accuracy: 0,
      deviceId: 'demo-device',
    }),
  });
  revalidatePath(`/attendance/${sessionId}`);
}

export async function recordPaymentAction(formData: FormData) {
  const invoiceId = String(formData.get('invoiceId') ?? '');
  const amountRupees = Number(formData.get('amount') ?? 0);
  const method = String(formData.get('method') ?? 'cash').toLowerCase();

  await api(`/fees/invoices/${invoiceId}/payments`, {
    method: 'POST',
    body: JSON.stringify({ amountPaise: Math.round(amountRupees * 100), method }),
  });
  revalidatePath('/fees');
}
