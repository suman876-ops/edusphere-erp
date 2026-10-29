'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';

export default function ConsoleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Console route error', { digest: error.digest });
  }, [error]);

  return (
    <div className="space-y-4">
      <Alert tone="error" title="This screen could not load">
        The console could not fetch its data. If you have just signed in, the session may still be
        refreshing — try again. Persistent failures usually mean the database is unreachable
        {error.digest ? ` (reference ${error.digest})` : ''}.
      </Alert>
      <div className="flex gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" onClick={() => window.location.assign('/login')}>
          Sign in again
        </Button>
      </div>
    </div>
  );
}
