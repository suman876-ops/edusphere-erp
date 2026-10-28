import { loginAction } from '../actions';

const DEMO_ACCOUNTS = [
  { email: 'admin.kol@edusphere.app', label: 'Campus Admin · Kolkata' },
  { email: 'superadmin@edusphere.app', label: 'Group Super Admin' },
  { email: 'faculty.rao@edusphere.app', label: 'Faculty · Kolkata' },
  { email: 'accountant.kol@edusphere.app', label: 'Accountant · Kolkata' },
];

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
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500 text-lg font-bold text-white">
            ES
          </div>
          <h1 className="text-xl font-semibold text-slate-900">EduSphere</h1>
          <p className="text-sm text-slate-500">Multi-campus college ERP</p>
        </div>

        <form action={loginAction} className="card card-pad space-y-4">
          <input type="hidden" name="next" value={params.next ?? '/'} />
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              defaultValue="admin.kol@edusphere.app"
              className="input"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              defaultValue="Passw0rd!"
              className="input"
              autoComplete="current-password"
            />
          </div>
          {params.error ? <p className="text-sm text-rose-600">{params.error}</p> : null}
          <button type="submit" className="btn-primary w-full">
            Sign in
          </button>
        </form>

        <div className="mt-4 rounded-xl border border-slate-200 bg-white/70 p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            Demo accounts (password Passw0rd!)
          </p>
          <ul className="space-y-1 text-xs text-slate-600">
            {DEMO_ACCOUNTS.map((a) => (
              <li key={a.email} className="flex justify-between gap-2">
                <span className="font-mono">{a.email}</span>
                <span className="text-slate-400">{a.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
