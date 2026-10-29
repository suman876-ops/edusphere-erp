# Cross-campus isolation matrix

Run this before any phase is marked complete. Two seeded campuses, six roles,
three attack shapes per endpoint. A cell passes only when no row from the other
campus is returned and no write is accepted.

| Endpoint | Shape | Expected |
| --- | --- | --- |
| `GET /api/v1/students` | other campus's rows only exist in campus B | empty or A-only |
| `GET /api/v1/students?sectionId=<B>` | foreign id in query | empty |
| `POST /api/v1/students` | body `campus_id` = B | 400/403, no row written |
| `PATCH /api/v1/students/<B>` | foreign id in URL | 404 |
| `GET /api/v1/fees/ledger/<B>` | foreign id in URL | 404 |
| `POST /api/v1/fees/invoices/<B>/payments` | foreign invoice | 404 |
| `GET /api/v1/attendance/sessions/<B>` | foreign id | 404 |
| `POST /api/v1/attendance/sessions/<B>/scan` | foreign session | 404 |
| `GET /api/v1/audit` | campus admin of A | A rows only |
| any endpoint | student of A reading student of B | empty |

Roles to cover: `CA`, `HOD`, `FAC`, `ACC`, `STU`, `PAR`.

Two properties make this testable at all, and both live in the database rather
than in a handler: `campus_id = any (auth_campus_ids())` on every policy, and
`unique (campus_id, id)` on every parent so a child cannot reference across.
