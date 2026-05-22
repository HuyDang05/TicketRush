# TicketRush Test Guide

This project uses Node's built-in `node:test` runner for the current test suite.
No extra test framework is required.

## Test Types

- Backend unit tests: validators and token utilities in `backend/test`.
- Frontend unit tests: pure utilities, seat generation, seatmap layout, and runtime CSS helpers in `frontend/test`.
- Build verification: `npm run build` in `frontend` catches bundling and JSX regressions.

## Current Automated Coverage

- Auth, user, event, booking, queue, seatmap, comment, admin, upload, and common validators.
- JWT sign/verify behavior.
- Frontend validation helpers.
- Seat generation for row, arc, and table layouts.
- Seatmap layout save/load flattening behavior.
- Runtime CSS helper behavior.
- Shared frontend formatting utilities.

## Still Needed For Full System Confidence

These require a running database, Redis, or browser test runner and should be added as integration/e2e tests:

- Auth API flow: register, login, refresh token, logout.
- Event admin flow: create, upload image, publish, update, end, delete.
- Seatmap API flow: save conflict handling with `seatmapVersion`.
- Queue flow: join, status, validate token, heartbeat, release.
- Booking flow: lock seat, prevent duplicate lock, release, checkout, QR verify.
- Socket.IO realtime flow: `seat_locked`, `seat_released`, `seat_sold`, queue updates.
- Browser e2e flow: customer event browsing, queue entry, seat selection, cart, checkout, my tickets.

## Commands

Run backend tests:

```powershell
cd backend
npm test
```

Run frontend tests:

```powershell
cd frontend
npm test
```

Run everything from the repository root:

```powershell
.\test\run-all.ps1
```

The all-in-one script runs backend tests, frontend tests, and the frontend production build.
