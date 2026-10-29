import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight, CalendarCheck, GraduationCap, ReceiptText, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'EduSphere — Multi-campus college ERP',
  description:
    'One platform for admissions, student records, timetable, attendance, examinations and fees across every campus in a college group.',
};

const PILLARS = [
  {
    icon: GraduationCap,
    title: 'One record per student',
    body: 'Admission enquiry through to alumni, in a single history that never gets overwritten.',
  },
  {
    icon: CalendarCheck,
    title: 'Attendance you can defend',
    body: 'Rotating QR codes with a geofence, plus the raw scan evidence kept for disputes.',
  },
  {
    icon: ReceiptText,
    title: 'Money that reconciles',
    body: 'Invoice-driven fees with an append-only ledger, so balances are derived, never typed in.',
  },
  {
    icon: ShieldCheck,
    title: 'Isolated by the database',
    body: 'Row-Level Security on every table: one campus cannot read another, even by guessing an id.',
  },
];

const CAMPUSES = [
  'Midnapore City College',
  'Midnapore College (Autonomous)',
  "Raja Narendralal Khan Women's College (Autonomous)",
  'K.D. College of Commerce & General Studies',
  'Vidyasagar University',
];

export default function HomePage() {
  return (
    <>
      <section className="border-b border-slate-200 bg-gradient-to-br from-slate-50 via-white to-brand-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">
            Multi-campus college ERP
          </p>
          <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            Run every campus of your group from one system.
          </h1>
          <p className="mt-5 max-w-2xl text-base text-slate-600 sm:text-lg">
            Admissions, student records, timetable, attendance, examinations and fees — with
            each campus isolated from the others by the database itself, not by a checkbox.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/programs">
                Browse programmes
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">Staff sign in</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6" aria-labelledby="pillars">
        <h2 id="pillars" className="text-xl font-semibold text-slate-900">
          What the platform guarantees
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((pillar) => (
            <Card key={pillar.title}>
              <CardHeader>
                <pillar.icon className="h-5 w-5 text-brand-600" aria-hidden="true" />
                <CardTitle className="pt-2">{pillar.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600">{pillar.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white" aria-labelledby="campuses">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 id="campuses" className="text-xl font-semibold text-slate-900">
            Campuses in the group
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Each is a separate tenant with its own academic year, staff and data. All five are
            awaiting an administrator&apos;s approval, so nothing is published for them yet.
          </p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CAMPUSES.map((name) => (
              <li
                key={name}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/60 px-4 py-3"
              >
                <span className="text-sm font-medium text-slate-800">{name}</span>
                <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                  Pending
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-slate-500">
            Names are listed as supplied by the group. No programmes, fees or staff are shown
            until a campus is activated.
          </p>
        </div>
      </section>
    </>
  );
}
