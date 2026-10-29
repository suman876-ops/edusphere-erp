import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/empty-state';

export const metadata: Metadata = {
  title: 'Programmes — EduSphere',
  description: 'Programmes offered across the campuses of the group.',
};

export default function ProgramsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Programmes</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Every programme across every campus in the group, with eligibility, seats and fees.
        </p>
      </header>

      <div className="mt-8">
        <EmptyState
          title="The catalogue opens with Phase 2"
          hint="Programmes, batches and subjects are created per campus once an administrator activates it. No sample programmes are shown, because invented fees and eligibility would be worse than an empty list."
          action={
            <Button asChild variant="outline">
              <Link href="/campuses">See the campuses</Link>
            </Button>
          }
        />
      </div>
    </div>
  );
}
