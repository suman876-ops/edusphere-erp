import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'EduSphere — Campus Console',
  description: 'Multi-campus college ERP: students, attendance and fees.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
