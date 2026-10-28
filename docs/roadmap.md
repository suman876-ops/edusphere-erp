# Roadmap — from this slice to the full spec

The PDF spec scores 8.5/10 difficulty with a 9–11 month MVP. This repo is the **4–5 month reduced
core**, and even that is delivered module by module. Order matters: each phase ships something a
college can use on Monday.

## Phase 0 — done in this repo (week 1–3)

- Monorepo, Docker compose, env handling
- Auth + JWT + role metadata + campus scoping
- Academic structure (department -> program -> section), courses
- Students CRUD + search/pagination
- Attendance sessions, rotating QR + geofence, scan, subject-wise %
- Fees: invoices, counter payments, receipts, ledger, outstanding
- Audit log, dashboard KPIs, admin console screens

## Phase 1 — admissions + structure depth (week 4–7)

- Application wizard (7 steps, autosave), document upload to S3/MinIO with presigned URLs
- Merit list, seat matrix, offer letter, enrolment conversion
- Bulk CSV/XLSX import via BullMQ worker + validation report
- Notices/announcements, communication composer with audience builder

## Phase 2 — exams & results (week 8–12)

- Exam terms, date sheet with per-student clash check, seating plan generator
- Hall ticket + mark sheet PDFs (Playwright + Handlebars templates)
- Marks entry grid, moderation, grade computation (CGPA / percentage schemes)
- Result publish with preview + revaluation queue

## Phase 3 — timetable solver (week 13–16)

- Python 3.12 + OR-Tools CP-SAT sidecar, constraint model (rooms, faculty load, max hours/day)
- Async job via BullMQ, progress over Socket.IO, draft -> edit -> publish versions
- Substitutions and swaps

## Phase 4 — finance depth + gateway (week 17–20)

- Fee structures by program/batch/category, instalments, concessions, scholarships
- Razorpay orders + webhook signature verification + settlement reconciliation
- Refunds, day book, head-wise collection, GST reports, defaulters + reminders

## Phase 5 — campus life (week 21–26)

- Library circulation (ISBN lookup, barcode, reservations, fines)
- Hostel blocks/rooms/beds, allocation, outpass + gate log
- Transport routes/stops/vehicles, GPS ingest (MQTT), live map + ETA
- Helpdesk, certificates with QR verification, parent portal, PTM slots

## Phase 6 — hardening

- Postgres RLS policies per campus, Redis caching, rate limits
- OpenTelemetry -> Tempo/Loki/Prometheus, Sentry, k6 load tests, Testcontainers integration tests
- Backups, DR drill, blue/green deploys via Argo CD

## Explicit non-goals for the MVP

DigiLocker push, WhatsApp Business API, mobile app store releases, white-label domains. Each is a
bolt-on once the web core is stable.
