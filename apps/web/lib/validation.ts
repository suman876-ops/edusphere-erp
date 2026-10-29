import { z } from 'zod';

/** Shared by the route handlers and (later) the forms. One schema, two callers. */

export const listStudentsQuery = z.object({
  q: z.string().trim().max(120).optional(),
  programId: z.string().uuid().optional(),
  sectionId: z.string().uuid().optional(),
  status: z.enum(['active', 'dropped', 'alumni', 'suspended']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}).strict();

export const createStudent = z.object({
  firstName: z.string().trim().min(2),
  lastName: z.string().trim().min(1),
  regNo: z.string().trim().min(3),
  email: z.string().email().optional(),
  phone: z.string().trim().max(20).optional(),
  programId: z.string().uuid(),
  sectionId: z.string().uuid(),
  admissionYear: z.coerce.number().int().min(1990).max(2100),
  guardianName: z.string().trim().max(120).optional(),
  guardianPhone: z.string().trim().max(20).optional(),
}).strict();

export const updateStudent = z.object({
  firstName: z.string().trim().min(2).optional(),
  lastName: z.string().trim().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().trim().max(20).optional(),
  status: z.enum(['active', 'dropped', 'alumni', 'suspended']).optional(),
  guardianName: z.string().trim().max(120).optional(),
  guardianPhone: z.string().trim().max(20).optional(),
}).strict();

const legacyMode = z
  .string()
  .transform((m) => m.toLowerCase())
  .pipe(z.enum(['manual', 'qr', 'qr_geo']));

export const openSession = z.object({
  subjectId: z.string().uuid().optional(),
  courseId: z.string().uuid().optional(),   // the old screens still send this name
  sectionId: z.string().uuid(),
  mode: legacyMode.default('qr'),
  onDate: z.string().date().optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  radiusM: z.coerce.number().int().min(10).max(1000).default(150),
}).strict().transform((v) => {
  const subjectId = v.subjectId ?? v.courseId;
  if (!subjectId) throw new Error('subjectId is required');
  return { ...v, subjectId };
});

export const manualMark = z.object({
  records: z.array(z.object({
    studentId: z.string().uuid(),
    status: z.enum(['P', 'A', 'L', 'OD']),
  })).min(1),
}).strict();

export const scan = z.object({
  token: z.string().min(3),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(10000).default(0),
  deviceId: z.string().trim().min(3).max(200),
}).strict();

export const createInvoice = z.object({
  studentId: z.string().uuid(),
  term: z.string().trim().min(1).max(60),
  head: z.string().trim().min(1).max(60).default('Tuition'),
  dueDate: z.string().date(),
  amountPaise: z.coerce.number().int().min(1),
}).strict();

export const recordPayment = z.object({
  amountPaise: z.coerce.number().int().min(1),
  method: z.enum(['cash', 'upi', 'card', 'netbanking', 'cheque', 'dd', 'gateway']).default('cash'),
  reference: z.string().trim().max(120).optional(),
}).strict();
