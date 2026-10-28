import { redirect } from 'next/navigation';
import { logoutAction, setCampusAction } from '@/app/actions';
import { Nav } from '@/components/nav';
import { api } from '@/lib/api';
import type { Campus, SessionUser } from '@/lib/types';
import { cookies } from 'next/headers';

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  let user: SessionUser;
  let campuses: Campus[];
  try {
    [user, campuses] = await Promise.all([
      api<SessionUser>('/auth/me'),
      api<Campus[]>('/campuses'),
    ]);
  } catch {
    redirect('/login');
  }

  const store = await cookies();
  const selected = store.get('es_campus')?.value ?? user.campusId ?? '';
  const activeCampus = campuses.find((c) => c.id === selected) ?? campuses[0];

  return (
    <div className="min-h-screen lg:flex">
      <aside className="w-full shrink-0 border-b border-slate-200 bg-white lg:w-64 lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-sm font-bold text-white">
            ES
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">EduSphere</p>
            <p className="text-xs text-slate-500">{activeCampus?.name ?? 'Group'}</p>
          </div>
        </div>

        <div className="px-3 pb-4">
          <Nav />
        </div>

        <div className="border-t border-slate-100 px-4 py-4">
          {user.role === 'SA' && campuses.length > 1 ? (
            <form action={setCampusAction} className="mb-4">
              <label className="label" htmlFor="campusId">
                Active campus
              </label>
              <select id="campusId" name="campusId" defaultValue={selected} className="input mb-2">
                {campuses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button type="submit" className="btn-ghost w-full">
                Switch
              </button>
            </form>
          ) : null}

          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
              {user.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800">{user.name}</p>
              <p className="text-xs text-slate-500">{user.role}</p>
            </div>
          </div>
          <form action={logoutAction} className="mt-3">
            <button type="submit" className="text-xs font-medium text-slate-500 hover:text-rose-600">
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
