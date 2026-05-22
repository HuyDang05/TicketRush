# Setup Guide

This guide explains how to run TicketRush locally. Commands assume PowerShell from the repository root `d:\ticketRush`.

## 1. Prerequisites

- Node.js 18+ and npm 9+.
- PostgreSQL 14+.
- Redis 6+.
- Python 3.10+ if you need to run the crawler.
- Cloudinary account for image upload features.
- Google/Facebook OAuth credentials for social login.

## 2. Install Dependencies

```powershell
cd backend
npm install

cd ..\frontend
npm install
```

Crawler dependencies:

```powershell
cd crawler
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## 3. Backend Configuration

Create `backend/.env` from the sample file:

```powershell
Copy-Item backend\.env.example backend\.env
```

Environment variables:

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string used by Prisma. |
| `DIRECT_URL` | Required by schema | Direct PostgreSQL connection string. In local development it is usually the same as `DATABASE_URL`. |
| `REDIS_URL` | Yes | Redis connection URL, for example `redis://localhost:6379`. |
| `JWT_SECRET` | Yes | Secret used to sign access tokens, refresh tokens, and QR payloads. |
| `JWT_EXPIRES_IN` | Recommended | Access token lifetime, for example `1d`. |
| `JWT_REFRESH_EXPIRES_IN` | Recommended | Refresh token lifetime, for example `7d`. |
| `PORT` | No | Backend port. Defaults to `3000`. |
| `CLIENT_URL` | Recommended | Frontend origin for CORS and OAuth redirects, for example `http://localhost:3001`. |
| `BACKEND_URL` | Recommended | Public backend URL for OAuth callbacks, for example `http://localhost:3000`. |
| `CLOUDINARY_URL` | For uploads | Cloudinary URL. Cloudinary upload features will not work without it. |
| `GMAIL_USER` | For password reset | Gmail account used to send reset emails. |
| `GMAIL_APP_PASSWORD` | For password reset | Gmail app password. |
| `GOOGLE_CLIENT_ID` | For Google OAuth | Google OAuth client ID. |
| `GOOGLE_CLIENT_SECRET` | For Google OAuth | Google OAuth client secret. |
| `FACEBOOK_APP_ID` | For Facebook OAuth | Facebook app ID. |
| `FACEBOOK_APP_SECRET` | For Facebook OAuth | Facebook app secret. |
| `QUEUE_CAPACITY` | No | Number of active queue slots. Defaults to `50`. |
| `QUEUE_BATCH` | No | Number of users admitted per batch. Defaults to `50`. |
| `QUEUE_ACTIVE_TTL_SECONDS` | No | Active queue token TTL. Defaults to `45`. |
| `QUEUE_WAITING_TTL_SECONDS` | No | Waiting heartbeat TTL. Defaults to `45`. |

Example local configuration:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ticketrush?schema=public"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/ticketrush?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="replace-with-a-long-random-secret"
JWT_EXPIRES_IN="1d"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=3000
CLIENT_URL="http://localhost:3001"
BACKEND_URL="http://localhost:3000"
```

## 4. Frontend Configuration

Create `frontend/.env`:

```powershell
Copy-Item frontend\.env.example frontend\.env
```

Frontend variables:

| Variable | Description |
| --- | --- |
| `VITE_API_URL` | API base URL, for example `http://localhost:3000/api`. |
| `VITE_SOCKET_URL` | Socket.IO server URL, for example `http://localhost:3000`. |

Example:

```env
VITE_API_URL="http://localhost:3000/api"
VITE_SOCKET_URL="http://localhost:3000"
```

## 5. Database And Seed Data

Make sure PostgreSQL is running and the database referenced by `DATABASE_URL` exists. Then run:

```powershell
cd backend
npm run db:migrate
npm run db:seed
```

The seed script reads `crawler/events.json` and creates users, events, zones, and seats. It may call Nominatim to geocode venues, so the first seed run can take time and may require network access.

Seed accounts:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@ticketrush.com` | `admin123` |
| Customer | `cus1@gmail.com` | `123456789` |
| Customer | `cus2@gmail.com` | `123456789` |

## 6. Run The Application

Backend terminal:

```powershell
cd backend
npm run dev
```

Frontend terminal:

```powershell
cd frontend
npm run dev
```

Verify:

- Backend health check: `http://localhost:3000/health`.
- Swagger UI: `http://localhost:3000/api/docs`.
- Frontend: the URL printed by Vite, usually `http://localhost:3001`.

## 7. Common Issues

| Issue | Resolution |
| --- | --- |
| Backend port is already in use | Change `PORT` in `backend/.env` or stop the process using port 3000. |
| Frontend CORS errors | Ensure `CLIENT_URL` matches the active Vite URL. |
| Prisma reports missing `DIRECT_URL` | Add `DIRECT_URL` to `backend/.env`. |
| Redis connection refused | Start Redis or update `REDIS_URL`. |
| Image upload fails | Check `CLOUDINARY_URL` and ensure the multipart field is named `image`. |
| Password reset email is not sent | Check `GMAIL_USER`, `GMAIL_APP_PASSWORD`, and Gmail app password setup. |

