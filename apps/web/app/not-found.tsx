import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">404</p>
      <h1 className="text-2xl font-semibold text-slate-900">That page does not exist</h1>
      <p className="max-w-md text-sm text-slate-600">
        The link may be out of date. Nothing has been deleted — this is simply not a route in the
        application.
      </p>
      <div className="flex gap-2">
        <Button asChild>
          <Link href="/">Back to home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">Open the console</Link>
        </Button>
      </div>
    </div>
  );
}
