### Resource Person (RP) flow (edge-to-edge)

- Entry & authentication
  - RP UI is in the Netlify app; authentication via Firebase Auth (client SDK).
  - Admin controls availability via `rp_registration_enabled` setting.

- Registration
  - When enabled, RPs register with required fields; server checks duplicates.
  - Profiles are saved in `resource_persons` collection (Firestore) via server storage layer or Firebase helpers.

- Access & actions
  - RP sees sponsor-specific content, announcements, and can respond where permitted.
  - May contribute materials through admin-approved workflows (as implemented in UI).

- Announcements & replies
  - Read: GET `/api/announcements` (by sponsor where applicable).
  - Reply: POST `/api/announcements/:id/replies` (role identified on server for admin; for RP/trainee replies current flow allows without strict JWT validation).

- Notifications
  - GET `/api/notifications?userId=<uid>`; PATCH `/api/notifications/:id/read` to mark read.

- Failure modes
  - Registration disabled → UI hides or shows disabled state.
  - Duplicate email rejected by server.


