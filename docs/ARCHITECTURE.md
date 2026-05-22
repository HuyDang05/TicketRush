# Architecture

TicketRush has three primary parts: a React frontend, an Express backend, and data/crawler tooling. The backend exposes REST APIs and Socket.IO realtime events, stores durable data in PostgreSQL through Prisma, and uses Redis for queue and lock coordination.

## High-Level Flow

```text
Browser
  |
  | React/Vite, Axios, Socket.IO Client
  v
Frontend
  |
  | HTTP /api + WebSocket
  v
Backend Express
  |-- Auth/JWT/Refresh Cookie
  |-- REST Controllers + Zod Validators
  |-- Socket.IO seat/queue events
  |-- BullMQ seat-release jobs
  |
  | Prisma                 | Redis
  v                        v
PostgreSQL              Queue/Locks/TTL
```

## Backend

Entry points:

- `backend/src/server.js`: creates the HTTP server, initializes Socket.IO, starts workers, and handles graceful shutdown.
- `backend/src/app.js`: configures Express middleware, CORS, Swagger, and route mounting.

Layering:

- `routes/`: endpoint definitions and middleware wiring.
- `controllers/`: HTTP request/response orchestration.
- `services/`: reusable business logic such as booking, checkout, queue, and analytics.
- `validators/`: Zod schemas for request body, query, and params.
- `middlewares/`: authentication, role checks, and request validation.
- `config/`: Prisma, Redis, Socket.IO, Cloudinary, Swagger, and Multer configuration.
- `jobs/`: BullMQ queue and worker logic for seat release.
- `utils/`: JWT, mailer, image validation, and route printing helpers.

Route groups:

- `/api/auth`: registration, login, refresh, logout, password reset, Google/Facebook OAuth.
- `/api/users`: user profile, password changes, and account deletion.
- `/api/events`: public event browsing, event details, and reviews.
- `/api/bookings`: seat lock, pending locks, checkout, lock release, and user tickets.
- `/api/queue`: event-level virtual waiting room.
- `/api/admin`: admin profile, accounts, upload, event CRUD, seatmap, dashboard, analytics, and ticket reporting.

## Frontend

Entry points:

- `frontend/src/main.jsx`: mounts the React application.
- `frontend/src/App.jsx`: defines routes and customer/admin/auth layouts.

Main areas:

- `pages/customer/`: home, event exploration/detail, queue, seat selection, cart, checkout, tickets, and account.
- `pages/admin/`: dashboard, event manager, event wizard, seatmap editor, revenue, audience, and admin accounts.
- `pages/auth/`: login, register, forgot/reset password, and OAuth callback.
- `components/seatmap/`: admin/customer canvas seatmap components.
- `components/seat-map/`: customer seat rendering components.
- `services/`: Axios API wrappers.
- `hooks/`: auth, socket, countdown, theme, and toast hooks.
- `store/`: Zustand stores.
- `context/`: cart and language contexts.
- `lib/`: seat generator, seatmap layout, and runtime CSS helpers.

Routing highlights:

- Public/customer: `/`, `/events`, `/events/:id`.
- Protected customer: `/cart`, `/checkout`, `/my-tickets`, `/account`, `/events/:id/queue`, `/events/:id/seats`.
- Auth: `/login`, `/register`, `/forgot-password`, `/reset-password`, `/auth/callback`.
- Protected admin: `/admin`, `/admin/events`, `/admin/events/create`, `/admin/events/:id/edit`, `/admin/events/:id/seatmap`, `/admin/revenue`, `/admin/users`.

## Data Model

Prisma models:

- `User`: customer/admin accounts, profile fields, role, bookings, created events, reset/refresh tokens, and comments.
- `Event`: event metadata, venue, category, geo coordinates, status, seatmap JSON, zones, and comments.
- `Zone`: price zone under an event.
- `Seat`: seat under a zone with `AVAILABLE`, `LOCKED`, or `SOLD` status.
- `Booking`: booking, temporary lock, or payment record with `PENDING`, `PAID`, or `CANCELLED` status.
- `PasswordResetToken`: password reset flow.
- `RefreshToken`: hashed refresh token per user.
- `Comment`: event review with rating and optional image.

Important constraints:

- `User.email` is unique.
- `Seat` is unique by `[zoneId, row, col]`.
- `Booking.seatId` is unique, preventing more than one booking record per seat.
- Event deletion cascades into zones, seats, and comments according to Prisma relations.

## Seatmap And Booking

Seatmap data is represented in two layers:

- `Event.seatmapJson`: layout JSON used by the renderer/editor to persist canvas, zone, and seat structure.
- `Zone` and `Seat`: normalized records used for booking, lock state, seat status, and analytics.

Seat workflow:

1. Admin creates or edits an event and saves its seatmap.
2. Customer opens an event and may be routed through the virtual queue.
3. Customer selects a seat; the frontend calls `POST /api/bookings/lock`.
4. Backend creates a `PENDING` booking, marks the seat as `LOCKED`, and schedules release on timeout.
5. Socket.IO broadcasts realtime events so other clients update seat status.
6. Successful checkout marks the booking as `PAID`, the seat as `SOLD`, and generates a QR payload.
7. Manual release or timeout returns the seat to `AVAILABLE`.

## Virtual Queue

The queue uses Redis to:

- Track waiting users per event.
- Admit users into the active purchase window based on `QUEUE_CAPACITY` and `QUEUE_BATCH`.
- Issue short-lived active tokens controlled by `QUEUE_ACTIVE_TTL_SECONDS`.
- Track waiting heartbeat TTL with `QUEUE_WAITING_TTL_SECONDS`.

The frontend queue page must keep heartbeat/status updates active to avoid TTL expiration.

## Realtime

Socket.IO is initialized in `server.js`. The backend emits seat and queue changes so the frontend can update without page reloads.

When changing realtime event contracts, update these areas together:

- `backend/src/config/socket.js`.
- The service/controller that emits the event.
- `frontend/src/hooks/useSocket.js`.
- The page/component that subscribes to the event.

## External Integrations

- Cloudinary: event/comment image uploads.
- Gmail/Nodemailer: password reset email.
- Google OAuth and Facebook OAuth: social login.
- Nominatim: venue geocoding during seed.
- Ticketbox API: crawler source for `crawler/events.json`.

