import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { haversineMeters } from '@/lib/format';
import { requireCampus } from './tenancy';
import { hasRole, type SessionUser } from './auth';
import type { manualMark, scan } from '@/lib/validation';
import type { z } from 'zod';

type OpenSessionInput = {
  subjectId: string;
  sectionId: string;
  mode: 'manual' | 'qr' | 'qr_geo';
  onDate?: string;
  lat?: number;
  lng?: number;
  radiusM: number;
};

const SESSION_ROW = `id, on_date, mode, status, lat, lng, radius_m, opened_at, closed_at,
  subject_id, section_id, faculty_id,
  subject:subjects (id, code, title), section:sections (id, name, semester)`;

export async function listSessions(user: SessionUser, limit = 25) {
  const campus = await requireCampus(user);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('attendance_sessions')
    .select(SESSION_ROW)
    .eq('campus_id', campus.id)
    .order('opened_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function openAttendanceSession(
  user: SessionUser,
  input: OpenSessionInput,
) {
  if (!hasRole(user, 'FAC', 'CA', 'SA')) {
    throw Object.assign(new Error('Requires role: FAC, CA, SA'), { code: '42501' });
  }
  const campus = await requireCampus(user);
  if (!user.groupId) throw Object.assign(new Error('User has no group scope'), { code: '42501' });
  if (input.mode === 'qr_geo' && (input.lat === undefined || input.lng === undefined)) {
    throw new Error('qr_geo sessions need lat and lng');
  }

  const supabase = await createClient();
  const { data: subject } = await supabase
    .from('subjects').select('id').eq('id', input.subjectId).eq('campus_id', campus.id).maybeSingle();
  if (!subject) throw new Error('subjectId does not belong to this campus');

  const { data: section } = await supabase
    .from('sections').select('id').eq('id', input.sectionId).eq('campus_id', campus.id).maybeSingle();
  if (!section) throw new Error('sectionId does not belong to this campus');

  const { data, error } = await supabase
    .from('attendance_sessions')
    .insert({
      group_id: user.groupId,
      campus_id: campus.id,
      subject_id: input.subjectId,
      section_id: input.sectionId,
      faculty_id: user.id,
      mode: input.mode,
      on_date: input.onDate ?? new Date().toISOString().slice(0, 10),
      lat: input.lat,
      lng: input.lng,
      radius_m: input.radiusM,
    })
    .select(SESSION_ROW)
    .single();
  if (error) throw error;
  return data;
}

export async function getAttendanceSession(user: SessionUser, id: string) {
  const campus = await requireCampus(user);
  const supabase = await createClient();

  const { data: session, error } = await supabase
    .from('attendance_sessions')
    .select(SESSION_ROW)
    .eq('id', id)
    .eq('campus_id', campus.id)
    .maybeSingle();
  if (error) throw error;
  if (!session) throw Object.assign(new Error('Session not found'), { code: 'P0002' });

  const { data: roster } = await supabase
    .from('students')
    .select('id, reg_no, first_name, last_name')
    .eq('campus_id', campus.id)
    .eq('section_id', session.section_id)
    .eq('status', 'active')
    .order('reg_no');

  const { data: records } = await supabase
    .from('attendance_records')
    .select('id, student_id, status, source, marked_at, suspicious')
    .eq('session_id', id);

  const present = (records ?? []).filter((r) => r.status === 'P' || r.status === 'OD').length;

  return {
    ...session,
    roster: roster ?? [],
    records: records ?? [],
    stats: { roster: roster?.length ?? 0, present, total: roster?.length ?? 0 },
  };
}

export async function closeAttendanceSession(user: SessionUser, id: string) {
  const campus = await requireCampus(user);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('attendance_sessions')
    .update({ status: 'closed', closed_at: new Date().toISOString() })
    .eq('id', id)
    .eq('campus_id', campus.id)
    .select(SESSION_ROW)
    .single();
  if (error) throw error;
  return data;
}

export async function markManually(user: SessionUser, id: string, input: z.infer<typeof manualMark>) {
  const campus = await requireCampus(user);
  if (!user.groupId) throw Object.assign(new Error('User has no group scope'), { code: '42501' });
  const supabase = await createClient();

  const { data: session } = await supabase
    .from('attendance_sessions')
    .select('id, status')
    .eq('id', id)
    .eq('campus_id', campus.id)
    .maybeSingle();
  if (!session) throw Object.assign(new Error('Session not found'), { code: 'P0002' });
  if (session.status === 'closed') throw new Error('Session is closed');

  const rows = input.records.map((r) => ({
    group_id: user.groupId,
    campus_id: campus.id,
    session_id: id,
    student_id: r.studentId,
    status: r.status,
    source: 'manual',
  }));

  const { error } = await supabase
    .from('attendance_records')
    .upsert(rows, { onConflict: 'session_id,student_id' });
  if (error) throw error;
  return { marked: rows.length };
}

/** Faculty-only. The secret never leaves the database. */
export async function currentQrToken(user: SessionUser, id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('app_qr_token', { p_session: id, p_step: null });
  if (error) throw error;

  const token = data as string;
  const step = Number(token.split('.')[0]);
  const windowMs = 20_000;
  return {
    token,
    step,
    expiresAt: new Date((step + 1) * windowMs).toISOString(),
  };
}

/**
 * Student scan. Order matters: token, enrollment, device, distance, duplicate.
 * Writes go through the service role, so a client cannot insert a record itself.
 */
export async function scanAttendance(
  user: SessionUser,
  id: string,
  input: z.infer<typeof scan>,
) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: session } = await supabase
    .from('attendance_sessions')
    .select('id, group_id, campus_id, status, mode, lat, lng, radius_m, section_id')
    .eq('id', id)
    .maybeSingle();
  if (!session) throw Object.assign(new Error('Session not found'), { code: 'P0002' });
  if (session.status === 'closed') throw new Error('Session is closed');

  const verdict = await supabase.rpc('app_verify_qr', { p_session: id, p_token: input.token });
  if (verdict.error) throw verdict.error;
  const tokenVerdict = verdict.data as string;
  if (tokenVerdict === 'expired') throw new Error('QR code expired, scan the live code');
  if (tokenVerdict === 'invalid') throw new Error('Invalid QR code');
  if (tokenVerdict !== 'ok') throw new Error(`QR rejected: ${tokenVerdict}`);

  const { data: student } = await supabase
    .from('students')
    .select('id, section_id, campus_id')
    .eq('profile_id', user.id)
    .maybeSingle();
  if (!student) throw Object.assign(new Error('No student record for this user'), { code: '42501' });
  if (student.section_id !== session.section_id) {
    throw new Error('You are not enrolled in this section');
  }

  const flags: string[] = [];

  const { data: bound } = await admin
    .from('devices')
    .select('device_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!bound) {
    await admin.from('devices').insert({
      group_id: session.group_id,
      campus_id: session.campus_id,
      user_id: user.id,
      device_id: input.deviceId,
    });
  } else if (bound.device_id !== input.deviceId) {
    flags.push('device mismatch');
  }

  let distance: number | null = null;
  if (session.mode === 'qr_geo' && session.lat !== null && session.lng !== null) {
    distance = haversineMeters(session.lat, session.lng, input.lat, input.lng);
    if (distance > session.radius_m + input.accuracy) {
      flags.push(`outside geofence (${Math.round(distance)} m)`);
    }
  }

  const { data: sameDevice } = await admin
    .from('attendance_records')
    .select('student_id')
    .eq('session_id', id)
    .eq('device_id', input.deviceId)
    .neq('student_id', student.id)
    .limit(1);
  if (sameDevice && sameDevice.length > 0) flags.push('device already used by another student');

  const suspicious = flags.length > 0;

  await admin.from('attendance_scan_events').insert({
    group_id: session.group_id,
    campus_id: session.campus_id,
    session_id: id,
    student_id: student.id,
    device_id: input.deviceId,
    lat: input.lat,
    lng: input.lng,
    accuracy_m: input.accuracy,
    distance_m: distance,
    verdict: suspicious ? 'flagged' : 'accepted',
    reason: flags.join('; ') || null,
  });

  if (suspicious && flags.some((f) => f.startsWith('outside geofence'))) {
    throw new Error(`Rejected: ${flags.join('; ')}`);
  }

  const { data, error } = await admin
    .from('attendance_records')
    .upsert(
      {
        group_id: session.group_id,
        campus_id: session.campus_id,
        session_id: id,
        student_id: student.id,
        status: 'P',
        source: 'qr',
        lat: input.lat,
        lng: input.lng,
        device_id: input.deviceId,
        suspicious,
      },
      { onConflict: 'session_id,student_id' },
    )
    .select('id, status, suspicious, marked_at')
    .single();
  if (error) throw error;

  return { record: data, flags };
}

/** Subject-wise percentage with the "classes needed for 75%" figure. */
export async function attendanceSummary(user: SessionUser, studentId: string) {
  const campus = await requireCampus(user);
  const supabase = await createClient();

  const { data: rows, error } = await supabase
    .from('attendance_records')
    .select(`status, session:attendance_sessions!inner (subject_id, subject:subjects (code, title))`)
    .eq('campus_id', campus.id)
    .eq('student_id', studentId);
  if (error) throw error;

  const bySubject = new Map<string, { code: string; title: string; held: number; present: number }>();

  for (const row of (rows ?? []) as unknown as Array<{
    status: string;
    session: { subject_id: string; subject: { code: string; title: string } };
  }>) {
    const key = row.session.subject_id;
    const entry = bySubject.get(key) ?? {
      code: row.session.subject.code,
      title: row.session.subject.title,
      held: 0,
      present: 0,
    };
    entry.held += 1;
    if (row.status === 'P' || row.status === 'OD') entry.present += 1;
    bySubject.set(key, entry);
  }

  const subjects = [...bySubject.values()].map((s) => {
    const percent = s.held === 0 ? 0 : Math.round((s.present / s.held) * 100);
    const needed = percent >= 75 ? 0 : Math.ceil((0.75 * s.held - s.present) / 0.25);
    return { ...s, percent, neededToReach75: Math.max(0, needed) };
  });

  const held = subjects.reduce((n, s) => n + s.held, 0);
  const present = subjects.reduce((n, s) => n + s.present, 0);

  return {
    overall: { held, present, percent: held === 0 ? 0 : Math.round((present / held) * 100) },
    subjects,
  };
}
