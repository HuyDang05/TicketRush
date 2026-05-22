# Testing Guide

TicketRush currently uses Node's built-in `node:test` runner. The current test suite does not require Jest or Vitest.

## Run Tests

Backend:

```powershell
cd backend
npm test
```

Frontend:

```powershell
cd frontend
npm test
```

Run everything from the repository root:

```powershell
.\test\run-all.ps1
```

The root test script runs:

1. Backend tests.
2. Frontend tests.
3. Frontend production build.

## Current Coverage

Backend:

- Auth, user, event, booking, queue, seatmap, comment, admin, upload, and common validators.
- JWT sign/verify behavior.
- Key Zod request schemas.

Frontend:

- Input validation helpers.
- Seat generation for row, arc, and table layouts.
- Seatmap layout save/load flattening behavior.
- Runtime CSS helpers.
- Shared formatting utilities.

## When To Add Tests

Add or update tests when changing:

- Validators, API contracts, or payload shapes.
- Booking, seat locking, queue, or checkout logic.
- Seatmap editor, generator, or layout logic.
- Auth token, refresh token, or role guard behavior.
- Shared frontend helpers.

## Recommended Future Coverage

These require a database, Redis, or browser test runner:

- Auth integration: register, login, refresh, logout.
- Admin event integration: create, upload, publish, update, end, delete.
- Seatmap API integration: save conflict behavior with `seatmapVersion`.
- Queue integration: join, status, token validation, heartbeat, release.
- Booking integration: lock seat, prevent duplicate lock, release, checkout, QR verification.
- Socket.IO integration: `seat_locked`, `seat_released`, `seat_sold`, queue updates.
- Browser e2e: event browsing, queue entry, seat selection, cart, checkout, my tickets.

## Test Conventions

- Backend tests live in `backend/test/**/*.test.js`.
- Frontend tests live in `frontend/test/**/*.test.js`.
- Prefer testing pure functions and validators when integration harnesses are not available.
- Do not place secrets, real database credentials, or real tokens in test fixtures.
- Validator tests should cover both successful inputs and realistic user-facing failure cases.

