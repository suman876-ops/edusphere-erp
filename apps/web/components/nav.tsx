'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: '◧' },
  { href: '/students', label: 'Students', icon: '◍' },
  { href: '/attendance', label: 'Attendance', icon: '◉' },
  { href: '/fees', label: 'Fees', icon: '₹' },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="space-y-1">
      {LINKS.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`nav-link ${active ? 'nav-link-active' : ''}`}
          >
            <span className="w-4 text-center text-base">{link.icon}</span>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
