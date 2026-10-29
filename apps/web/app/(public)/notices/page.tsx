import type { Metadata } from 'next';
import { EmptyState } from '@/components/empty-state';

export const metadata: Metadata = {
  title: 'Notices — EduSphere',
  description: 'Notices and circulars published by the group.',
};

export default function NoticesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Notices</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Circulars and announcements published by the group and its campuses.
        </p>
      </header>

      <div className="mt-8">
        <EmptyState
          title="No notices published yet"
          hint="Announcements arrive with the communication module. Nothing is shown here until a real notice is published."
        />
      </div>
    </div>
  );
}
