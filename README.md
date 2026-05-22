# TicketRush

TicketRush is a full-stack event ticketing application. It supports public event discovery, virtual waiting rooms, interactive seat selection, temporary seat locking, simulated checkout, and QR ticket viewing. The admin side supports event management, image upload, seatmap design, event publishing/ending, ticket revenue tracking, and audience analytics.

## Key Features

- Email/password authentication, refresh tokens, password reset, Google OAuth, and Facebook OAuth.
- Role-based access control with `CUSTOMER` and `ADMIN`.
- Customer experience: event listing, event detail, reviews, virtual queue, seat selection, cart, checkout, and ticket history.
- Admin experience: dashboard, event management, event create/edit wizard, seatmap editor, ticket/revenue management, audience analytics, and admin account management.
- Redis-backed virtual queue for controlling concurrent ticket purchasing access.
- Temporary seat locks and realtime seat status updates through Socket.IO.
- Cloudinary image upload support.
- Swagger API documentation at `/api/docs`.
- Node built-in test runner coverage for backend and frontend utility logic.
- Python crawler for generating event and seatmap seed data.

## Tech Stack

| Layer | Technologies |
| --- | --- |
| Frontend | React 18, Vite, React Router, Zustand, Axios, Socket.IO Client, React Konva, Tailwind CSS, Radix UI, Recharts |
| Backend | Node.js, Express, Prisma, PostgreSQL, Redis, BullMQ, Socket.IO, Zod, JWT, Passport/OAuth |
| Storage/Media | PostgreSQL, Redis, Cloudinary |
| Documentation/Test | Swagger/OpenAPI, node:test, PowerShell test runner |
| Data Tools | Python, requests, Ticketbox crawler |

## Repository Structure

```text
ticketRush/
+-- backend/                 # Express API, Prisma schema, queues, sockets, validators, tests
|   +-- docs/openapi.yaml     # Reference OpenAPI specification
|   +-- prisma/               # Prisma schema, migrations, seed script
|   +-- scripts/              # Demo and maintenance scripts
|   +-- src/                  # Backend source code
|   +-- test/                 # Backend unit tests
+-- frontend/                # React/Vite application
|   +-- src/                  # Pages, components, services, hooks, stores, utilities
|   +-- test/                 # Frontend unit tests
+-- crawler/                 # Python crawler and events.json seed source
+-- test/                    # Root-level test automation
+-- docs/                    # Project documentation
```

## Requirements

- Node.js 18+.
- npm 9+.
- PostgreSQL 14+.
- Redis 6+.
- Python 3.10+ if you need to run the crawler.
- Cloudinary account for image uploads.
- Google/Facebook OAuth apps for social login.

## Quick Start

1. Install dependencies:

```powershell
cd backend
npm install

cd ..\frontend
npm install
```

2. Create environment files:

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env
```

Update `backend/.env` and `frontend/.env` using [docs/SETUP.md](docs/SETUP.md).

3. Run database migrations and seed data:

```powershell
cd backend
npm run db:migrate
npm run db:seed
```

4. Start the backend:

```powershell
cd backend
npm run dev
```

By default, the API runs at `http://localhost:3000`.

5. Start the frontend:

```powershell
cd frontend
npm run dev
```

The Vite dev server typically runs at `http://localhost:3001`, or the next available port if that port is already in use.

## Default Seed Accounts

After running `npm run db:seed`, the seed script creates:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@ticketrush.com` | `admin123` |
| Customer | `cus1@gmail.com` | `123456789` |
| Customer | `cus2@gmail.com` | `123456789` |

## Common Commands

| Command | Directory | Description |
| --- | --- | --- |
| `npm run dev` | `backend` | Start the Express API with nodemon |
| `npm start` | `backend` | Start the Express API with node |
| `npm run db:migrate` | `backend` | Run Prisma migrations |
| `npm run db:seed` | `backend` | Seed users, events, zones, and seats |
| `npm test` | `backend` | Run backend tests |
| `npm run demo:race` | `backend` | Run the seat-lock race demo |
| `npm run dev` | `frontend` | Start the Vite dev server |
| `npm run build` | `frontend` | Build the frontend for production |
| `npm test` | `frontend` | Run frontend tests |
| `.\test\run-all.ps1` | root | Run backend tests, frontend tests, and frontend build |

## Documentation

- [docs/SETUP.md](docs/SETUP.md): installation, environment variables, database, Redis, and seed data.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): system architecture, backend/frontend modules, and data model.
- [docs/API.md](docs/API.md): API groups, authentication, realtime behavior, and core workflows.
- [docs/TESTING.md](docs/TESTING.md): test commands, current coverage, and remaining test gaps.
- [docs/OPERATIONS.md](docs/OPERATIONS.md): crawler, queue scripts, seat-lock demo, and operational checklist.
- [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md): contribution, review, and coding guidelines.
- [test/README.md](test/README.md): concise repository test guide.

## Important Routes And Endpoints

- Customer frontend: `/`, `/events`, `/events/:id`, `/events/:id/queue`, `/events/:id/seats`, `/cart`, `/my-tickets`.
- Admin frontend: `/admin`, `/admin/events`, `/admin/events/create`, `/admin/events/:id/seatmap`, `/admin/revenue`, `/admin/users`.
- Backend health check: `GET /health`.
- Swagger UI: `GET /api/docs`.
- Public API base: `http://localhost:3000/api`.

## Quality Notes

- Backend request validation is implemented with Zod through `validate.middleware.js`.
- `prisma/schema.prisma` is the source of truth for database structure.
- Seats are unique by `zoneId,row,col`; bookings are unique by `seatId` to reduce double-booking risk.
- Redis powers the virtual queue and BullMQ seat-release jobs.
- Frontend utility logic is separated into testable modules for input validation, seat generation, seatmap layout, and runtime CSS.

