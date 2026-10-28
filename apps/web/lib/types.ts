export type Role = 'SA' | 'CA' | 'AO' | 'HOD' | 'FAC' | 'EXC' | 'ACC' | 'LIB' | 'WAR' | 'TRM' | 'STU' | 'PAR';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  campusId: string | null;
  campusName: string;
}

export interface Campus {
  id: string;
  name: string;
  code: string;
  city: string | null;
}

export interface Student {
  id: string;
  enrollmentNo: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  status: 'ACTIVE' | 'DROPPED' | 'ALUMNI';
  admissionYear: number;
  program: { id: string; name: string; code: string };
  section: { id: string; name: string; batch: number; semester: number };
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; pages: number };
}

export interface Invoice {
  id: string;
  number: string;
  term: string;
  head: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  status: 'UNPAID' | 'PARTIAL' | 'PAID' | 'VOID';
  student: {
    id: string;
    firstName: string;
    lastName: string;
    enrollmentNo: string;
    section?: { name: string };
  };
  payments?: { id: string; amount: number; mode: string; receiptNo: string; paidAt: string }[];
}

export interface SessionRow {
  id: string;
  date: string;
  mode: 'MANUAL' | 'QR' | 'QR_GEOFENCE';
  status: 'OPEN' | 'CLOSED';
  course: { code: string; title: string };
  section: { name: string; batch: number };
  _count?: { records: number };
}

export interface DashboardSummary {
  students: { active: number; dropped: number };
  attendanceToday: { sessions: number; marks: number; present: number; percent: number };
  finance: { outstanding: number; collectedThisMonth: number; paymentCount: number; openInvoices: number };
  recentInvoices: Invoice[];
  recentSessions: SessionRow[];
}

export interface AttendanceSummary {
  student: { id: string; name: string; enrollmentNo: string; program: string; section: string };
  overall: { held: number; attended: number; percent: number; shortage: boolean };
  subjects: { code: string; title: string; held: number; attended: number; percent: number; shortage: boolean }[];
}

export interface Ledger {
  student: { id: string; name: string; enrollmentNo: string; program: string; section: string };
  totals: { billed: number; paid: number; outstanding: number };
  invoices: Invoice[];
}

export interface SessionDetail {
  id: string;
  date: string;
  mode: 'MANUAL' | 'QR' | 'QR_GEOFENCE';
  status: 'OPEN' | 'CLOSED';
  radiusM: number;
  lat: number | null;
  lng: number | null;
  course: { code: string; title: string };
  section: { id: string; name: string; batch: number };
  records: {
    id: string;
    status: string;
    source: string;
    markedAt: string;
    student: { id: string; firstName: string; lastName: string; enrollmentNo: string };
  }[];
  stats: { roster: number; present: number; absent: number };
}
