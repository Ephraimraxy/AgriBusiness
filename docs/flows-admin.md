### Admin flow (edge-to-edge)

- Authentication
  - Navigate to `/admin-login` or `/123456`.
  - POST `/api/admin/login` with email/password.
  - Server sets `adminToken` cookie (HttpOnly, SameSite=None; Secure in production).
  - Client verifies session via GET `/api/admin/me` and stores minimal user info in `localStorage`.

- Dashboard load
  - Client loads cards and tables via React Query using `apiRequest` (sends credentials).
  - Key reads:
    - GET `/api/statistics` (totals, charts).
    - GET `/api/trainees` (list for tables, filters, exports).
    - GET `/api/sponsors` and GET `/api/sponsors/active`.
    - GET `/api/settings/registration_enabled`, `/api/settings/staff_registration_enabled`, `/api/settings/rp_registration_enabled`.

- Registration controls (feature flags)
  - Toggle trainee registration: POST `/api/settings` with `{ key: 'registration_enabled', value: 'true'|'false' }`.
  - Toggle staff registration: POST `/api/settings` with `{ key: 'staff_registration_enabled', value: 'true'|'false' }`.
  - Toggle RP registration: POST `/api/settings` with `{ key: 'rp_registration_enabled', value: 'true'|'false' }`.

- Sponsor management
  - Read: GET `/api/sponsors`; GET `/api/sponsors/active`.
  - Create: POST `/api/sponsors`.
  - Update/activate: PATCH `/api/sponsors/:id` (activating deactivates others).
  - Delete: DELETE `/api/sponsors/:id`.

- Trainee management (admin view)
  - Read: GET `/api/trainees` (auth enforced).
  - Edit/Delete/Export: UI triggers API or Firebase helpers, then invalidates lists.
  - Housekeeping: allocate rooms/tags; manual cleanup of invalid tags.

- Exams and CBT
  - Exams: POST `/api/exams`, PUT `/api/exams/:id`, DELETE `/api/exams/:id`.
  - Questions: POST `/api/exams/:examId/questions`, GET `/api/exams/:examId/questions`, PUT `/api/questions/:id`, DELETE `/api/questions/:id`.
  - Attempts: GET `/api/exam-attempts`, POST `/api/exam-attempts/:attemptId/grade`.
  - CBT bank via client `cbtService` (Firestore): create/update/delete/get.

- Announcements and replies
  - Announcements: GET `/api/announcements`, POST `/api/announcements`, PATCH `/api/announcements/:id`, DELETE `/api/announcements/:id`.
  - Replies: GET `/api/announcements/:id/replies`, POST `/api/announcements/:id/replies`.
  - Notifications: GET `/api/notifications?userId=...`, PATCH `/api/notifications/:id/read`.

- Settings and system data
  - GET `/api/settings/:key` and POST `/api/settings` to read/write settings.

- Security/authorization
  - Admin-only routes require `adminToken` cookie.
  - CORS allows Netlify origin; cookies are `SameSite=None; Secure` in production.
  - Client requests include `credentials: 'include'`.

- Session lifecycle
  - Startup: GET `/api/admin/me`; 401 redirects to login.
  - Logout: POST `/api/admin/logout`; clears cookie and redirects to login.

- Failure modes
  - 401 → redirect to login.
  - CORS/cookie issues → verify Netlify `VITE_API_URL` and Render CORS.
  - Firestore index errors → fallbacks or empty lists until indexes are added.


