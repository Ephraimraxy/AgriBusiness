### Staff flow (edge-to-edge)

- Entry & authentication
  - Staff UI is part of the Netlify app; authentication via Firebase Auth (client SDK).
  - Admin controls availability via `staff_registration_enabled` setting.

- Registration
  - When enabled, staff register with required fields; server duplicates checks similar to trainees.
  - Profile stored in `staffs` collection (Firestore) through server storage layer or Firebase helpers.

- Access & actions
  - Access to staff-specific content and tools (e.g., content authoring, mentoring dashboards) as defined in UI.
  - Reads content via `/api/content` (optionally filtered by sponsor) and interacts with announcements.

- Announcements & replies
  - View announcements: GET `/api/announcements`.
  - Reply where permitted: POST `/api/announcements/:id/replies` (role identified client-side until full role auth is added).

- Notifications
  - GET `/api/notifications?userId=<uid>`; mark read via PATCH `/api/notifications/:id/read`.

- Failure modes
  - Registration disabled → hide or show disabled state in UI.
  - Duplicate email prevents new registration.


