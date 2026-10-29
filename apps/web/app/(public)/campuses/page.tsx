import type { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'Campuses — EduSphere',
  description: 'The campuses in the group and their approval status.',
};

const CAMPUSES = [
  { name: 'Midnapore City College', city: 'Midnapore' },
  { name: 'Midnapore College (Autonomous)', city: 'Midnapore' },
  { name: "Raja Narendralal Khan Women's College (Autonomous)", city: 'Midnapore' },
  { name: 'K.D. College of Commerce & General Studies', city: 'Midnapore' },
  { name: 'Vidyasagar University', city: 'Midnapore' },
];

export default function CampusesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Campuses</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Each campus is an independent tenant: its own academic year, staff, students and
          finances.
        </p>
      </header>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {CAMPUSES.map((campus) => (
          <Card key={campus.name}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <CardTitle>{campus.name}</CardTitle>
                <Badge variant="warning">Pending approval</Badge>
              </div>
              <CardDescription>{campus.city}, West Bengal</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                Facilities, contacts and programme details appear once an administrator activates
                this campus.
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
