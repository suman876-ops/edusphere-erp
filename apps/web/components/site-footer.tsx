import Link from 'next/link';

const COLUMNS = [
  {
    title: 'Explore',
    links: [
      { href: '/programs', label: 'Programmes' },
      { href: '/campuses', label: 'Campuses' },
      { href: '/notices', label: 'Notices' },
    ],
  },
  {
    title: 'Access',
    links: [
      { href: '/login', label: 'Staff console' },
      { href: '/contact', label: 'Contact' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-xs font-bold text-white">
              ES
            </span>
            <span className="text-sm font-semibold text-slate-900">EduSphere</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-slate-500">
            A multi-campus college ERP: admissions to alumni, on one platform.
          </p>
        </div>

        {COLUMNS.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {column.title}
            </p>
            <ul className="mt-3 space-y-2">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-slate-600 hover:text-brand-600">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-slate-100">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-slate-500 sm:px-6">
          © {new Date().getFullYear()} EduSphere. Institution names shown are unaffiliated placeholders
          pending approval.
        </p>
      </div>
    </footer>
  );
}
