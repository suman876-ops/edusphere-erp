import type { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';

export const metadata: Metadata = {
  title: 'Contact — EduSphere',
  description: 'How to reach the group office.',
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Contact</h1>
        <p className="mt-2 text-sm text-slate-600">
          Admissions enquiries are handled by each campus office.
        </p>
      </header>

      <div className="mt-8 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Group office</CardTitle>
            <CardDescription>Midnapore, West Bengal</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            <p>
              Telephone and email are published once the group office confirms them. They are
              deliberately blank rather than invented.
            </p>
          </CardContent>
        </Card>

        <Alert tone="info" title="Enquiry form is not live yet">
          The enquiry form depends on the admissions module, which is Phase 3. It will appear here
          with spam protection and a delivery receipt.
        </Alert>
      </div>
    </div>
  );
}
