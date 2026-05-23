-- Add event-level seat hold sessions. Existing bookings stay valid with a
-- nullable session reference; new locks will attach to a session.
CREATE TYPE "HoldSessionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'PAID', 'CANCELLED');

CREATE TABLE "seat_hold_sessions" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "status" "HoldSessionStatus" NOT NULL DEFAULT 'ACTIVE',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "cooldownUntil" TIMESTAMP(3),
  "jobId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "seat_hold_sessions_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "bookings" ADD COLUMN "holdSessionId" TEXT;

CREATE INDEX "bookings_holdSessionId_idx" ON "bookings"("holdSessionId");
CREATE INDEX "seat_hold_sessions_userId_eventId_status_idx" ON "seat_hold_sessions"("userId", "eventId", "status");
CREATE INDEX "seat_hold_sessions_expiresAt_idx" ON "seat_hold_sessions"("expiresAt");

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_holdSessionId_fkey"
  FOREIGN KEY ("holdSessionId") REFERENCES "seat_hold_sessions"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "seat_hold_sessions"
  ADD CONSTRAINT "seat_hold_sessions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "seat_hold_sessions"
  ADD CONSTRAINT "seat_hold_sessions_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "events"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
