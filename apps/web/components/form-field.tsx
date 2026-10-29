import * as React from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type ControlProps = {
  id: string;
  'aria-invalid': boolean;
  'aria-describedby': string | undefined;
  required?: boolean;
};

/**
 * Wires up the accessibility contract once, in a server-safe way: the child control
 * is cloned with id / aria-invalid / aria-describedby / required, and the error is
 * announced with role="alert". A render-prop would not survive the server/client
 * boundary, so cloning is the mechanism.
 */
export function FormField({
  id,
  label,
  hint,
  error,
  required,
  className,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactElement<ControlProps>;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  const control = React.cloneElement(children, {
    id,
    'aria-invalid': Boolean(error),
    'aria-describedby': describedBy,
    required,
  });

  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id}>
        {label}
        {required ? (
          <span className="ml-1 text-rose-600" aria-hidden="true">
            *
          </span>
        ) : null}
      </Label>

      {control}

      {hint && !error ? (
        <p id={hintId} className="text-xs text-slate-500">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-rose-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
