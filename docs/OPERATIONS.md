# Operations And Development Notes

This document collects supporting commands and operational notes for TicketRush local/development environments.

## Health Check

Backend:

```powershell
Invoke-RestMethod http://localhost:3000/health
```

Expected response:

```json
{ "status": "OK" }
```

## Swagger

Swagger UI:

```text
http://localhost:3000/api/docs
```

Use Swagger to inspect endpoints and request shapes when frontend/backend contracts drift.

## Redis Queue Maintenance

The backend includes a virtual queue reset script:

```powershell
cd backend
node scripts/reset-virtual-queue.js
```

The script uses `REDIS_URL` or defaults to `redis://localhost:6379`.

Use it when local queue state is stuck or before running a queue demo.

## Seat Race Demo

The seat-lock race demo script:

```powershell
cd backend
$env:DEMO_API_URL="http://localhost:3000/api"
$env:DEMO_EVENT_ID="<event-id>"
$env:DEMO_SEAT_LABEL="<seat-label>"
npm run demo:race
```

Supported variables:

| Variable | Description |
| --- | --- |
| `DEMO_API_URL` | API base URL. Defaults to `http://localhost:3000/api`. |
| `DEMO_EVENT_ID` | Event ID used for the demo. |
| `DEMO_SEAT_LABEL` | Seat label used for the lock race. |
| `DEMO_PASSWORD` | Demo user password. Defaults to `TicketRush123`. |
| `DEMO_PREP_ONLY` | Set to `1` to only prepare demo users/data. |
| `DEMO_USER1_EMAIL` | Email for demo user 1. |
| `DEMO_USER2_EMAIL` | Email for demo user 2. |

## Crawler

The crawler lives in `crawler/` and generates `events.json` for database seeding.

Install dependencies:

```powershell
cd crawler
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Run the default crawl:

```powershell
python crawler.py --output events.json
```

Example smaller crawl:

```powershell
python crawler.py --categories music sport --target-per-category 5 --max-pages 2 --no-detail --output events.json
```

Notes:

- The crawler calls the Ticketbox API and applies delays between requests.
- `backend/prisma/seed.js` reads the generated `events.json`.
- Seatmap templates are stored in `crawler/venue KDT Vin zones x.txt`.

## Fetch Seatmap Templates From Backend

`fetch_event_seatmaps.py` fetches `seatmapJson` from configured events and appends it to the crawler template file:

```powershell
cd crawler
python fetch_event_seatmaps.py --base-url http://localhost:3000
```

Options:

- `--dry-run`: print seatmaps without writing files.
- `--replace`: replace the template with the fetched seatmaps.
- `--output <path>`: change the output file.

## Seed Data

Seed:

```powershell
cd backend
npm run db:seed
```

The seed script deletes existing data from the main tables before recreating users, events, zones, and seats. Do not run it against a database that contains data you need to keep.

The seed script may call Nominatim to geocode venues. Supported variables:

| Variable | Description |
| --- | --- |
| `NOMINATIM_BASE_URL` | Nominatim base URL. Defaults to the official endpoint. |
| `NOMINATIM_USER_AGENT` | User agent for geocoding requests. |
| `NOMINATIM_EMAIL` | Optional email included in requests. |
| `NOMINATIM_DELAY_MS` | Delay between requests. Defaults to `2000`. |
| `NOMINATIM_MAX_RETRIES` | Retry count. Defaults to `2`. |

## Pre-Merge Checklist

- `npm test` passes in `backend`.
- `npm test` passes in `frontend`.
- `npm run build` passes in `frontend`.
- New endpoints validate input with Zod where applicable.
- API docs and README are updated for public workflow changes.
- No `.env`, local cache, logs, or secrets are committed.
- Queue/seat-lock changes are verified with Redis running and either manual checks or the race demo script.

