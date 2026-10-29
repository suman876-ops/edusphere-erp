import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'EduSphere — Multi-campus college ERP',
    template: '%s · EduSphere',
  },
  description:
    'Multi-campus college ERP: admissions, student records, timetable, attendance, examinations and fees.',
  applicationName: 'EduSphere',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#3b5bdb',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
