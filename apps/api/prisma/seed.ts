/**
 * Demo seed: two campuses, real role mix, 24 students per campus, courses,
 * attendance history with a couple of shortages, and fee invoices where some
 * students have paid and some are defaulters.
 */
import {
  AttendanceMode,
  AttendanceStatus,
  InvoiceStatus,
  PaymentMode,
  PrismaClient,
  Role,
  StudentStatus,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const PASSWORD = 'Passw0rd!';

const FIRST = [
  'Aarav', 'Ishita', 'Rohan', 'Priya', 'Arjun', 'Sneha', 'Vikram', 'Ananya',
  'Karthik', 'Meera', 'Sourav', 'Ritika', 'Aditya', 'Nandini', 'Rahul', 'Pooja',
  'Siddharth', 'Tanya', 'Debashish', 'Shreya', 'Manish', 'Ayesha', 'Nikhil', 'Ira',
];
const LAST = [
  'Sharma', 'Banerjee', 'Patel', 'Nair', 'Ghosh', 'Iyer', 'Reddy', 'Das',
  'Chatterjee', 'Menon', 'Kulkarni', 'Bose', 'Verma', 'Roy', 'Joshi', 'Sen',
  'Pillai', 'Mukherjee', 'Rao', 'Saha', 'Gupta', 'Khan', 'Dutta', 'Bhattacharya',
];

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function main() {
  console.log('clearing existing data...');
  await prisma.auditLog.deleteMany();
  await prisma.feePayment.deleteMany();
  await prisma.feeInvoice.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.attendanceSession.deleteMany();
  await prisma.student.deleteMany();
  await prisma.course.deleteMany();
  await prisma.section.deleteMany();
  await prisma.program.deleteMany();
  await prisma.department.deleteMany();
  await prisma.user.deleteMany();
  await prisma.campus.deleteMany();
  await prisma.group.deleteMany();

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const group = await prisma.group.create({ data: { name: 'Meridian Education Trust' } });

  const campusDefs = [
    { code: 'KOL', name: 'Kolkata Main Campus', city: 'Kolkata' },
    { code: 'DGP', name: 'Durgapur Campus', city: 'Durgapur' },
  ];

  for (const def of campusDefs) {
    const campus = await prisma.campus.create({
      data: { groupId: group.id, code: def.code, name: def.name, city: def.city },
    });

    const cse = await prisma.department.create({
      data: { campusId: campus.id, name: 'Computer Science & Engineering', code: 'CSE' },
    });
    const mgmt = await prisma.department.create({
      data: { campusId: campus.id, name: 'Management Studies', code: 'MGMT' },
    });

    const btech = await prisma.program.create({
      data: {
        campusId: campus.id,
        departmentId: cse.id,
        name: 'B.Tech Computer Science',
        code: 'BTECH-CSE',
        level: 'UG',
        durationYrs: 4,
      },
    });
    const bba = await prisma.program.create({
      data: {
        campusId: campus.id,
        departmentId: mgmt.id,
        name: 'Bachelor of Business Administration',
        code: 'BBA',
        level: 'UG',
        durationYrs: 3,
      },
    });

    const sectionA = await prisma.section.create({
      data: { campusId: campus.id, programId: btech.id, name: 'CSE-A', batch: 2023, semester: 3 },
    });
    const sectionB = await prisma.section.create({
      data: { campusId: campus.id, programId: btech.id, name: 'CSE-B', batch: 2023, semester: 3 },
    });
    const sectionMba = await prisma.section.create({
      data: { campusId: campus.id, programId: bba.id, name: 'BBA-A', batch: 2024, semester: 1 },
    });

    const courseDefs = [
      { code: 'CS301', title: 'Data Structures & Algorithms', credits: 4, semester: 3 },
      { code: 'CS302', title: 'Database Management Systems', credits: 3, semester: 3 },
      { code: 'CS303', title: 'Operating Systems', credits: 3, semester: 3 },
      { code: 'MG201', title: 'Principles of Management', credits: 3, semester: 1 },
    ];
    const courses = [];
    for (const c of courseDefs) {
      courses.push(await prisma.course.create({ data: { ...c, campusId: campus.id } }));
    }

    const faculty = await prisma.user.create({
      data: {
        campusId: campus.id,
        email: def.code === 'KOL' ? 'faculty.rao@edusphere.app' : `faculty.${def.code.toLowerCase()}@edusphere.app`,
        name: def.code === 'KOL' ? 'Dr. Anil Rao' : 'Dr. Sunita Bose',
        role: Role.FAC,
        passwordHash,
      },
    });

    const adminEmail = `admin.${def.code.toLowerCase()}@edusphere.app`;
    await prisma.user.createMany({
      data: [
        { campusId: campus.id, email: adminEmail, name: `${def.name} Admin`, role: Role.CA, passwordHash },
        { campusId: campus.id, email: `accountant.${def.code.toLowerCase()}@edusphere.app`, name: 'Accounts Desk', role: Role.ACC, passwordHash },
        { campusId: campus.id, email: `hod.cse.${def.code.toLowerCase()}@edusphere.app`, name: 'HoD CSE', role: Role.HOD, passwordHash },
        { campusId: campus.id, email: `librarian.${def.code.toLowerCase()}@edusphere.app`, name: 'Library Desk', role: Role.LIB, passwordHash },
      ],
    });

    // 24 students: 12 in CSE-A, 6 in CSE-B, 6 in BBA-A
    const students = [];
    for (let i = 0; i < 24; i += 1) {
      const section = i < 12 ? sectionA : i < 18 ? sectionB : sectionMba;
      const program = i < 18 ? btech : bba;
      const year = i < 18 ? 2023 : 2024;
      const seq = String(i + 1).padStart(3, '0');
      // the first student of each campus doubles as the student-portal login
      const email =
        i === 0 && def.code !== 'KOL'
          ? `student.${def.code.toLowerCase()}.1@edusphere.app`
          : `student.${i + 1}@edusphere.app`;
      students.push(
        await prisma.student.create({
          data: {
            campusId: campus.id,
            enrollmentNo: `${def.code}${year}${seq}`,
            firstName: FIRST[i % FIRST.length],
            lastName: LAST[i % LAST.length],
            email,
            phone: `+9198${String(30000000 + i * 137).slice(0, 8)}`,
            programId: program.id,
            sectionId: section.id,
            admissionYear: year,
            status: i === 23 ? StudentStatus.DROPPED : StudentStatus.ACTIVE,
            guardianName: `${FIRST[(i + 5) % FIRST.length]} ${LAST[i % LAST.length]}`,
            guardianPhone: `+9197${String(40000000 + i * 211).slice(0, 8)}`,
          },
        }),
      );
    }

    // student login for the first student of each campus
    await prisma.user.create({
      data: {
        campusId: campus.id,
        email: students[0].email ?? 'student.1@edusphere.app',
        name: `${students[0].firstName} ${students[0].lastName}`,
        role: Role.STU,
        passwordHash,
      },
    });

    // attendance history: 3 sessions per course, deterministic absences
    const roster = students.slice(0, 12);
    for (let c = 0; c < 3; c += 1) {
      for (let s = 0; s < 3; s += 1) {
        const session = await prisma.attendanceSession.create({
          data: {
            campusId: campus.id,
            courseId: courses[c].id,
            sectionId: sectionA.id,
            facultyId: faculty.id,
            date: daysAgo(7 - s * 2),
            mode: c === 1 ? AttendanceMode.QR_GEOFENCE : AttendanceMode.QR,
            status: 'CLOSED',
            qrSecret: `seed-${campus.code}-${c}-${s}`,
            lat: c === 1 ? 22.5726 : null,
            lng: c === 1 ? 88.3639 : null,
            radiusM: 150,
            closedAt: daysAgo(7 - s * 2),
          },
        });

        const records = roster.map((st, idx) => {
          const absent = (idx * 3 + s + c) % 9 === 0;
          return {
            sessionId: session.id,
            studentId: st.id,
            status: absent ? AttendanceStatus.A : AttendanceStatus.P,
            source: 'QR',
            markedAt: session.date,
            lat: c === 1 ? 22.5726 : null,
            lng: c === 1 ? 88.3639 : null,
          };
        });
        await prisma.attendanceRecord.createMany({ data: records });
      }
    }

    // fees: Term 1 (partly/fully paid) + Term 2 (unpaid) for every student
    let invoiceSeq = 0;
    let receiptSeq = 0;
    for (let i = 0; i < students.length; i += 1) {
      const student = students[i];
      invoiceSeq += 1;
      const t1 = await prisma.feeInvoice.create({
        data: {
          campusId: campus.id,
          studentId: student.id,
          number: `INV/2026-27/${String(invoiceSeq).padStart(5, '0')}`,
          term: 'Term 1 2026-27',
          head: 'Tuition',
          dueDate: daysAgo(45),
          amount: 4_500_000,
        },
      });
      invoiceSeq += 1;
      await prisma.feeInvoice.create({
        data: {
          campusId: campus.id,
          studentId: student.id,
          number: `INV/2026-27/${String(invoiceSeq).padStart(5, '0')}`,
          term: 'Term 2 2026-27',
          head: 'Tuition',
          dueDate: daysAgo(-20),
          amount: 4_500_000,
        },
      });

      if (i % 4 !== 0) {
        const amount = i % 3 === 0 ? 2_000_000 : 4_500_000;
        receiptSeq += 1;
        await prisma.feePayment.create({
          data: {
            campusId: campus.id,
            invoiceId: t1.id,
            amount,
            mode: i % 2 === 0 ? PaymentMode.UPI : PaymentMode.CASH,
            reference: i % 2 === 0 ? `UPI${900000 + i}` : null,
            receiptNo: `RCPT/${campus.code}/2026-27/${String(receiptSeq).padStart(6, '0')}`,
            paidAt: daysAgo(30 - (i % 10)),
          },
        });
        await prisma.feeInvoice.update({
          where: { id: t1.id },
          data: {
            paidAmount: amount,
            status: amount >= 4_500_000 ? InvoiceStatus.PAID : InvoiceStatus.PARTIAL,
          },
        });
      }
    }

    console.log(`seeded ${def.name}: ${students.length} students, ${courses.length} courses`);
  }

  await prisma.user.create({
    data: {
      campusId: null,
      email: 'superadmin@edusphere.app',
      name: 'Group Super Admin',
      role: Role.SA,
      passwordHash,
    },
  });

  console.log('done. login with any seeded email and password: Passw0rd!');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
