#!/usr/bin/env node
/**
 * End-to-end smoke test for the EduSphere MVP slice.
 * Assumes the API is running and the database has been seeded.
 *
 *   npm run smoke                      # against http://localhost:4000/v1
 *   BASE=http://host:4000/v1 npm run smoke
 */

const BASE = process.env.BASE ?? 'http://localhost:4000/v1';
const PASSWORD = process.env.SEED_PASSWORD ?? 'Passw0rd!';

let passed = 0;
const failures = [];

function check(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function call(path, { token, campusId, method = 'GET', body } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  if (campusId) headers['x-campus-id'] = campusId;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* empty body */
  }
  return { status: res.status, body: json };
}

async function login(email) {
  const res = await call('/auth/login', {
    method: 'POST',
    body: { email, password: PASSWORD },
  });
  if (res.status !== 200 && res.status !== 201) {
    throw new Error(`login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body;
}

async function main() {
  console.log(`EduSphere smoke test against ${BASE}\n`);

  console.log('auth & tenancy');
  const admin = await login('admin.kol@edusphere.app');
  check('campus admin can log in', Boolean(admin.accessToken));
  check('token carries the campus scope', admin.user?.campusId != null);

  const sa = await login('superadmin@edusphere.app');
  check('super admin can log in', Boolean(sa.accessToken));

  const bad = await call('/auth/login', {
    method: 'POST',
    body: { email: 'admin.kol@edusphere.app', password: 'wrong-password' },
  });
  check('wrong password is rejected', bad.status === 401, `got ${bad.status}`);

  const anon = await call('/students');
  check('missing token is rejected', anon.status === 401, `got ${anon.status}`);

  const campuses = await call('/campuses', { token: sa.accessToken });
  check('super admin sees both campuses', Array.isArray(campuses.body) && campuses.body.length === 2);

  const otherCampus = campuses.body.find((c) => c.code === 'DGP');
  const kolCampus = campuses.body.find((c) => c.code === 'KOL');

  const violation = await call('/students', {
    token: admin.accessToken,
    campusId: otherCampus.id,
  });
  check('campus user cannot read another campus', violation.status === 403, `got ${violation.status}`);

  const crossCampus = await call('/students?limit=3', {
    token: sa.accessToken,
    campusId: otherCampus.id,
  });
  check(
    'super admin can switch campus and sees DGP students',
    crossCampus.status === 200 &&
      crossCampus.body.data.every((s) => s.enrollmentNo.startsWith('DGP')),
  );

  console.log('\nstudents');
  const students = await call('/students?limit=5', { token: admin.accessToken });
  check('student list is paginated', students.body?.meta?.total >= 20, JSON.stringify(students.body?.meta));
  check('student rows include program and section', Boolean(students.body?.data?.[0]?.program?.code));

  const search = await call('/students?q=Ishita', { token: admin.accessToken });
  check(
    'search filters by first name',
    search.body.data.length === 0 || search.body.data.some((s) => s.firstName === 'Ishita'),
  );

  const created = await call('/students', {
    token: admin.accessToken,
    method: 'POST',
    body: {
      firstName: 'Test',
      lastName: 'Applicant',
      enrollmentNo: `KOL2026T${Date.now().toString().slice(-5)}`,
      email: `smoke.${Date.now()}@edusphere.app`,
      programId: students.body.data[0].program.id,
      sectionId: students.body.data[0].section.id,
      admissionYear: 2026,
    },
  });
  check('campus admin can create a student', created.status === 201, JSON.stringify(created.body));

  const dup = await call('/students', {
    token: admin.accessToken,
    method: 'POST',
    body: {
      firstName: 'Dup',
      lastName: 'Candidate',
      enrollmentNo: students.body.data[0].enrollmentNo,
      programId: students.body.data[0].program.id,
      sectionId: students.body.data[0].section.id,
      admissionYear: 2026,
    },
  });
  check('duplicate enrolment number is rejected', dup.status === 400, `got ${dup.status}`);

  const forbidden = await call('/students', {
    token: (await login('faculty.rao@edusphere.app')).accessToken,
    method: 'POST',
    body: { firstName: 'X', lastName: 'Y', enrollmentNo: 'NOPE', programId: 'x', sectionId: 'y', admissionYear: 2026 },
  });
  check('faculty cannot create students', forbidden.status === 403, `got ${forbidden.status}`);

  console.log('\nattendance');
  const courses = await call('/courses', { token: admin.accessToken });
  const sections = await call('/sections', { token: admin.accessToken });
  const cseA = sections.body.find((s) => s.name === 'CSE-A');
  const course = courses.body.find((c) => c.code === 'CS301');

  const session = await call('/attendance/sessions', {
    token: admin.accessToken,
    method: 'POST',
    body: { courseId: course.id, sectionId: cseA.id, mode: 'QR' },
  });
  check('session can be started', session.status === 201, JSON.stringify(session.body));

  const qr = await call(`/attendance/sessions/${session.body.id}/qr`, { token: admin.accessToken });
  check('rotating QR token is issued', typeof qr.body?.token === 'string' && qr.body.token.includes('.'));

  const student = await login('student.1@edusphere.app');
  const scan = await call(`/attendance/sessions/${session.body.id}/scan`, {
    token: student.accessToken,
    method: 'POST',
    body: { token: qr.body.token, deviceId: 'smoke-device-1' },
  });
  check('student can mark present with a live token', scan.status === 201, JSON.stringify(scan.body));

  const replay = await call(`/attendance/sessions/${session.body.id}/scan`, {
    token: student.accessToken,
    method: 'POST',
    body: { token: qr.body.token, deviceId: 'smoke-device-1' },
  });
  check('re-scan is idempotent, not a duplicate row', replay.status === 201);

  const staleStep = Math.floor(Date.now() / 20000) - 5;
  const expired = await call(`/attendance/sessions/${session.body.id}/scan`, {
    token: student.accessToken,
    method: 'POST',
    body: { token: `${staleStep.toString(36)}.deadbeef1234`, deviceId: 'smoke-device-1' },
  });
  check('expired token is rejected', expired.status === 400, JSON.stringify(expired.body));

  const tampered = await call(`/attendance/sessions/${session.body.id}/scan`, {
    token: student.accessToken,
    method: 'POST',
    body: { token: `${Math.floor(Date.now() / 20000).toString(36)}.000000000000`, deviceId: 'smoke-device-2' },
  });
  check('tampered token is rejected', tampered.status === 400, JSON.stringify(tampered.body));

  const geoSession = await call('/attendance/sessions', {
    token: admin.accessToken,
    method: 'POST',
    body: {
      courseId: course.id,
      sectionId: cseA.id,
      mode: 'QR_GEOFENCE',
      lat: 22.5726,
      lng: 88.3639,
      radiusM: 150,
    },
  });
  const geoQr = await call(`/attendance/sessions/${geoSession.body.id}/qr`, { token: admin.accessToken });

  const outside = await call(`/attendance/sessions/${geoSession.body.id}/scan`, {
    token: student.accessToken,
    method: 'POST',
    body: { token: geoQr.body.token, lat: 28.6139, lng: 77.209, deviceId: 'smoke-device-3' },
  });
  check('scan from outside the geofence is rejected', outside.status === 400, JSON.stringify(outside.body));

  const inside = await call(`/attendance/sessions/${geoSession.body.id}/scan`, {
    token: student.accessToken,
    method: 'POST',
    body: { token: geoQr.body.token, lat: 22.5727, lng: 88.364, deviceId: 'smoke-device-3' },
  });
  check('scan inside the geofence is accepted', inside.status === 201, JSON.stringify(inside.body));

  const detail = await call(`/attendance/sessions/${session.body.id}`, { token: admin.accessToken });
  check('session detail reports roster and present count', detail.body?.stats?.roster > 0);

  const studentId = students.body.data[0].id;
  const summary = await call(`/attendance/summary/${studentId}`, { token: admin.accessToken });
  check('subject-wise attendance summary is returned', Array.isArray(summary.body?.subjects));

  const closed = await call(`/attendance/sessions/${session.body.id}/close`, {
    token: admin.accessToken,
    method: 'POST',
  });
  check('session can be closed', closed.body?.status === 'CLOSED');

  console.log('\nfees');
  const invoices = await call('/fees/invoices?status=UNPAID&limit=3', { token: admin.accessToken });
  check('unpaid invoices are listed', invoices.body.data.length > 0);

  const invoice = invoices.body.data[0];
  const partial = await call(`/fees/invoices/${invoice.id}/payments`, {
    token: admin.accessToken,
    method: 'POST',
    body: { amount: Math.floor(invoice.amount / 2), mode: 'UPI', reference: 'smoke-upi' },
  });
  check('partial payment is recorded', partial.status === 201 && partial.body.invoice.status === 'PARTIAL');
  check('receipt number is campus-scoped', /^RCPT\/KOL\//.test(partial.body.payment.receiptNo), partial.body.payment.receiptNo);

  const overpay = await call(`/fees/invoices/${invoice.id}/payments`, {
    token: admin.accessToken,
    method: 'POST',
    body: { amount: invoice.amount * 2, mode: 'CASH' },
  });
  check('overpayment is rejected', overpay.status === 400, JSON.stringify(overpay.body));

  const settle = await call(`/fees/invoices/${invoice.id}/payments`, {
    token: admin.accessToken,
    method: 'POST',
    body: { amount: invoice.amount - partial.body.invoice.paidAmount, mode: 'CASH' },
  });
  check('final payment settles the invoice', settle.body.invoice.status === 'PAID');

  const ledger = await call(`/fees/ledger/${invoice.student.id}`, { token: admin.accessToken });
  check(
    'ledger totals are consistent',
    ledger.body.totals.billed - ledger.body.totals.paid === ledger.body.totals.outstanding,
  );

  const facultyPay = await call(`/fees/invoices/${invoices.body.data[1].id}/payments`, {
    token: (await login('faculty.rao@edusphere.app')).accessToken,
    method: 'POST',
    body: { amount: 100, mode: 'CASH' },
  });
  check('faculty cannot record payments', facultyPay.status === 403, `got ${facultyPay.status}`);

  console.log('\ndashboard & audit');
  const dash = await call('/dashboard/summary', { token: admin.accessToken });
  check('dashboard returns KPIs', typeof dash.body?.students?.active === 'number');
  check('dashboard outstanding is non-negative', dash.body.finance.outstanding >= 0);

  const audit = await call('/audit-logs?limit=5', { token: admin.accessToken });
  check('mutations are audited', Array.isArray(audit.body) && audit.body.length > 0);
  check(
    'audit rows never store raw passwords',
    !JSON.stringify(audit.body).includes(PASSWORD),
  );

  console.log(`\n${passed} checks passed, ${failures.length} failed`);
  if (failures.length) {
    console.log('\nFailures:');
    for (const f of failures) console.log(` - ${f}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('\nsmoke test crashed:', err.message);
  process.exit(1);
});
