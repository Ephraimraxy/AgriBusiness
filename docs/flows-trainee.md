### Trainee flow (edge-to-edge)

- Entry & authentication
  - Trainee browses Netlify app (`/`).
  - Authentication handled by Firebase Auth (client SDK).
  - On successful auth, profile may be created via POST `/api/users/profile` (server writes to Firestore) when needed.

- Registration (multi-step)
  - Feature-flagged by admin setting `registration_enabled`.
  - Step 1 (email verification):
    - POST `/api/register/step1` with `{ email, password, confirmPassword }`.
    - Server checks duplicates across collections and sends verification email via SMTP.
  - Step 2 (code verify):
    - POST `/api/register/verify` with `{ email, code }`.
  - Step 3 (complete):
    - POST `/api/register/complete` with full trainee payload → server assigns active sponsor and persists.

- Dashboard & content
  - Reads training content via GET `/api/content` (optionally filtered by sponsor).
  - Notifications via GET `/api/notifications?userId=<uid>`; mark read via PATCH `/api/notifications/:id/read`.

- Exams / CBT
  - Active exams list (public): GET `/api/exams/available` or client CBT bank listing.
  - Start an exam: POST `/api/exams/:examId/start` with `{ traineeId }` → returns attempt.
  - Submit attempt: POST `/api/exam-attempts/:attemptId/submit` with `{ answers }`.
  - View past attempts (client view): Firestore reads via `cbtService` or server GET `/api/exam-attempts?traineeId=...`.

- Evaluation
  - Fetch published evaluation questions (client) and submit responses (implementation-dependent; server UI reads via React Query where applicable).

- Resort allocations (if applicable in UI)
  - Read room/tag allocations via Firebase helper endpoints/data.
  - Trainee sees assigned room/tag when admin has allocated.

- Profile & settings
  - Profile persisted in `users` collection; reads via Firebase SDK.
  - Client-side state stored in localStorage only for convenience; source of truth is Firestore.

- Failure modes
  - Registration closed → UI hides registration or shows disabled state.
  - Email delivery issues → server returns 500; ask admin to check SMTP envs.
  - No active sponsor → `/api/register/complete` returns error until admin sets one active.


