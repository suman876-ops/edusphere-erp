'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // surface the digest only — never the message, which may contain query fragments
    console.error('Unhandled application error', { digest: error.digest });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
      <Alert tone="error" title="Something went wrong" className="max-w-lg">
        The page could not be rendered. This has been logged
        {error.digest ? ` (reference ${error.digest})` : ''}. Retrying usually helps when the
        problem is a temporary network failure.
      </Alert>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
