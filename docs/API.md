# API Guide

The default local backend URL is `http://localhost:3000`. REST APIs are mounted under `/api`. Swagger UI is available at `/api/docs`.

## Authentication

TicketRush uses:

- JWT access tokens in the `Authorization: Bearer <token>` header.
- HTTP-only refresh-token cookies with hashed refresh tokens stored in the database.
- Role-based access control with `CUSTOMER` and `ADMIN`.

The frontend Axios client automatically attaches the access token from `localStorage`. On `401`, it calls `/api/auth/refresh`; if refresh fails, the client logs the user out.

## Responses And Validation

Backend request validation uses Zod schemas in `backend/src/validators`. `validate.middleware.js` can validate:

- `params`
- `query`
- `body`

When adding a new endpoint, define a Zod schema and attach validation in the route.

## Public Endpoints

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Backend health check. |
| `GET` | `/api/docs` | Swagger UI. |
| `GET` | `/api/events` | Fetch public events with search/filter/pagination query support. |
| `GET` | `/api/events/search-suggestions` | Fetch event search suggestions. |
| `GET` | `/api/events/:id` | Fetch event details, zones, and seatmap. |
| `GET` | `/api/events/:id/comments` | Fetch event reviews/comments. |

## Auth Endpoints

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Register a customer account. |
| `POST` | `/api/auth/login` | Log in. |
| `POST` | `/api/auth/refresh` | Issue a new access token using the refresh cookie. |
| `POST` | `/api/auth/logout` | Log out and revoke the refresh token. |
| `POST` | `/api/auth/forgot-password` | Send password reset email. |
| `POST` | `/api/auth/reset-password` | Reset password using a reset token. |
| `GET` | `/api/auth/google` | Redirect to Google OAuth. |
| `GET` | `/api/auth/google/callback` | Google OAuth callback. |
| `GET` | `/api/auth/facebook` | Redirect to Facebook OAuth. |
| `GET` | `/api/auth/facebook/callback` | Facebook OAuth callback. |

## Customer/User Endpoints

Authentication is required.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/users/me` | Fetch the current user profile. |
| `PATCH` | `/api/users/me` | Update the current user profile. |
| `PATCH` | `/api/users/me/password` | Change password. |
| `DELETE` | `/api/users/me` | Delete the current account. |
| `POST` | `/api/events/:id/comments` | Create an event review/comment with optional image upload. |

## Booking Endpoints

Requires `CUSTOMER` or `ADMIN`.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/bookings/my-tickets` | Fetch the user's paid tickets. |
| `GET` | `/api/bookings/pending` | Fetch the user's temporary seat locks. |
| `POST` | `/api/bookings/lock` | Temporarily lock a selected seat. |
| `POST` | `/api/bookings/checkout` | Checkout pending bookings. |
| `DELETE` | `/api/bookings/:bookingId/release` | Release a temporary seat lock. |

## Queue Endpoints

Authentication is required. Stats requires `ADMIN`.

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/queue/:eventId/join` | Join the event virtual queue. |
| `GET` | `/api/queue/:eventId/status` | Fetch queue position/status. |
| `POST` | `/api/queue/:eventId/release` | Leave the queue. |
| `POST` | `/api/queue/:eventId/validate` | Validate a queue token before entering seat selection. |
| `GET` | `/api/queue/:eventId/stats` | Fetch queue statistics for admins. |

## Admin Endpoints

Requires `ADMIN`.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/admin/profile` | Fetch the current admin profile. |
| `GET` | `/api/admin/accounts` | List admin accounts. |
| `POST` | `/api/admin/accounts` | Create an admin account. |
| `POST` | `/api/admin/upload` | Upload an image to Cloudinary. |
| `GET` | `/api/admin/events` | List events for admin management. |
| `POST` | `/api/admin/events` | Create an event. |
| `GET` | `/api/admin/events/:id` | Fetch admin event details. |
| `PUT` | `/api/admin/events/:id` | Update an event. |
| `DELETE` | `/api/admin/events/:id` | Delete an event. |
| `PATCH` | `/api/admin/events/:id/publish` | Publish an event. |
| `PATCH` | `/api/admin/events/:id/end` | End an event. |
| `GET` | `/api/admin/events/:id/seatmap` | Fetch an event seatmap. |
| `PUT` | `/api/admin/events/:id/seatmap` | Save an event seatmap. |
| `GET` | `/api/admin/dashboard/:eventId` | Fetch dashboard stats for an event. |
| `GET` | `/api/admin/analytics/audience` | Fetch audience analytics. |
| `GET` | `/api/admin/tickets/events` | Fetch event ticket statistics. |
| `GET` | `/api/admin/tickets/events/:eventId/buyers` | Fetch ticket buyers for an event. |

## Main Workflows

### Login

1. Frontend calls `POST /api/auth/login`.
2. Backend returns an access token and user payload, and sets a refresh cookie.
3. Frontend stores the access token/user in localStorage and routes based on role.

### Create And Publish Event

1. Admin creates an event through `/api/admin/events`.
2. Admin uploads images through `/api/admin/upload` if needed.
3. Admin opens the seatmap editor and saves via `/api/admin/events/:id/seatmap`.
4. Admin publishes through `/api/admin/events/:id/publish`.
5. The event becomes visible in `/api/events`.

### Ticket Purchase

1. Customer opens the event detail page.
2. If queue access is required, the customer calls `/api/queue/:eventId/join` and polls/statuses the queue.
3. Once the queue token is valid, the customer enters `/events/:id/seats`.
4. Selecting a seat calls `/api/bookings/lock`.
5. Checkout calls `/api/bookings/checkout`.
6. Paid tickets appear in `/my-tickets`.

## Realtime Events

The Socket.IO server runs on the backend origin, by default `http://localhost:3000`.

The frontend should read the socket URL from `VITE_SOCKET_URL`. When changing realtime event contracts, verify:

- Queue page.
- Seat selection page.
- Admin dashboard if it subscribes to live stats.

## OpenAPI

The repository includes `backend/docs/openapi.yaml`, and Swagger UI is configured in `backend/src/config/swagger.js`. When adding or changing endpoints, update route-level Swagger JSDoc or the OpenAPI file so docs stay aligned with implementation.

