import Link from 'next/link';
import { loginAction } from '../actions';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/form-field';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const DEMO_ACCOUNTS = [
  { email: 'admin.demo@edusphere.app', label: 'Campus Admin' },
  { email: 'superadmin@edusphere.app', label: 'Group Super Admin' },
  { email: 'faculty.demo@edusphere.app', label: 'Faculty' },
  { email: 'accountant.demo@edusphere.app', label: 'Accountant' },
];

export const metadata = { title: 'Sign in' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-white to-brand-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Link
            href="/"
            className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500 text-lg font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            ES
          </Link>
          <h1 className="text-xl font-semibold text-slate-900">Sign in to EduSphere</h1>
          <p className="mt-1 text-sm text-slate-500">Staff and student console</p>
        </div>

        {params.error ? (
          <Alert tone="error" title="Could not sign you in" className="mb-4">
            Check the email and password, then try again. If the account is new, an administrator
            may not have activated it yet.
          </Alert>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Use the email address issued by your campus.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={loginAction} className="space-y-4" noValidate>
              <input type="hidden" name="next" value={params.next ?? '/dashboard'} />

              <FormField
                id="email"
                label="Email"
                required
                hint="The address your campus office holds for you."
              >
                <Input
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="username"
                  defaultValue="admin.demo@edusphere.app"
                  placeholder="you@college.edu"
                />
              </FormField>

              <FormField id="password" label="Password" required>
                <Input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                />
              </FormField>

              <Button type="submit" className="w-full">
                Sign in
              </Button>
            </form>
          </CardContent>
        </Card>

        <section className="mt-6" aria-labelledby="demo-accounts">
          <h2 id="demo-accounts" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Demo accounts
          </h2>
          <ul className="mt-2 space-y-1">
            {DEMO_ACCOUNTS.map((account) => (
              <li key={account.email} className="text-xs text-slate-500">
                <span className="font-medium text-slate-700">{account.label}</span> ·{' '}
                <span className="font-mono">{account.email}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-500">
            These exist only after <span className="font-mono">scripts/seed-demo.mjs</span> has run
            against this database.
          </p>
        </section>

        <p className="mt-6 text-center text-sm">
          <Link href="/" className="text-brand-600 hover:underline">
            ← Back to the public site
          </Link>
        </p>
      </div>
    </main>
  );
}
