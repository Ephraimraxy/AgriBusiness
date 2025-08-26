## AgriBusiness — Stack and Deployment Overview

### Stack
- Frontend: React 18 + Vite 5 + TypeScript, TanStack Query, Wouter, TailwindCSS
- Backend: Node.js + Express (ESM), bundled with esbuild
- Auth:
  - Trainee: Firebase Auth (client SDK)
  - Admin: Cookie-based session via Express (`adminToken`)
- Data: Firebase Firestore
- Email: Nodemailer (SMTP or Gmail)
- Deploy: Netlify (frontend), Render (backend)

### Repository Structure
- `client/` — React app, Vite config, Tailwind/PostCSS
- `server/` — Express app, routes, Firebase admin init, email service
- `shared/` — Shared schemas/types used by server and client
- `docs/` — Flow guides for Admin, Trainee, Staff, RP

### Environment Variables
Frontend (Netlify)
- `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_MEASUREMENT_ID`
- `VITE_API_URL=https://<render-service>.onrender.com`

Backend (Render)
- `NODE_ENV=production`
- Email/SMTP: `EMAIL_SERVICE`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`
- Or explicit SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_IGNORE_TLS_ERRORS`
- Optional: `CORS_ORIGIN=https://css-isac.netlify.app`

### Local Development
1) Install deps
```
npm ci
```
2) Start backend (dev)
```
npm run dev
```
3) Start client (faster hot reload)
```
cd client && npm install && npm run dev
```

### Build & Deploy
Frontend (Netlify)
- Base directory: `client`
- Build command: `npm run build`
- Publish directory: `dist`
- SPA routing: ensure `client/public/_redirects` contains `/* /index.html 200`

Backend (Render)
- Build: `npm ci && npm run build:server`
- Start: `npm start`
- esbuild strips dev-only Vite code, output: `dist/index.js`

### Runtime Integration
- Client API helper prefixes all `/api/*` calls with `VITE_API_URL` and sends `credentials: 'include'`.
- Server CORS allows Netlify origin and `Access-Control-Allow-Credentials: true`.
- Admin cookie is `HttpOnly; SameSite=None; Secure` in production to support Netlify → Render.

### Key Endpoints
- Admin auth: `POST /api/admin/login`, `GET /api/admin/me`, `POST /api/admin/logout`
- Settings: `GET /api/settings/:key`, `POST /api/settings`
- Sponsors: `GET /api/sponsors`, `GET /api/sponsors/active`, `POST /api/sponsors`, `PATCH /api/sponsors/:id`, `DELETE /api/sponsors/:id`
- Trainees: `GET /api/trainees`, `GET /api/trainees/:id`
- Content: `GET /api/content`, `POST /api/content`
- Exams: `POST /api/exams`, `PUT /api/exams/:id`, `DELETE /api/exams/:id`, `GET /api/exams/:id`
- Exam Questions: `POST /api/exams/:examId/questions`, `GET /api/exams/:examId/questions`, `PUT /api/questions/:id`, `DELETE /api/questions/:id`
- Attempts: `GET /api/exam-attempts`, `POST /api/exams/:examId/start`, `POST /api/exam-attempts/:attemptId/submit`, `POST /api/exam-attempts/:attemptId/grade`
- Announcements: `GET /api/announcements`, `POST /api/announcements`, `PATCH /api/announcements/:id`, `DELETE /api/announcements/:id`
- Announcement replies: `GET /api/announcements/:id/replies`, `POST /api/announcements/:id/replies`
- Notifications: `GET /api/notifications?userId=...`, `PATCH /api/notifications/:id/read`
- Registration: `POST /api/register/step1`, `POST /api/register/verify`, `POST /api/register/complete`

### Troubleshooting
- SPA 404 on Netlify routes → `_redirects`
- CORS/cookie errors → set `VITE_API_URL` (Netlify) and `CORS_ORIGIN` (Render), ensure cookie `SameSite=None; Secure` in prod
- Render build errors about Vite → ensure dev-only Vite imports are gated by `NODE_ENV !== 'production'` and esbuild defines `process.env.NODE_ENV='production'`
- `esbuild: not found` on Render → use `npx esbuild` and have `esbuild` in `dependencies`

### More Docs
See `docs/` for detailed flows:
- `docs/flows-admin.md`
- `docs/flows-trainee.md`
- `docs/flows-staff.md`
- `docs/flows-rp.md`

"# AgriBusiness" 
"# AgricTraining" 
"# AgricTraining" 
"# AgriBusiness" 
"# AgriBusiness" 
