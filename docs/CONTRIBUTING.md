# Contributing Guide

This guide defines working conventions that keep TicketRush readable, reviewable, and aligned across frontend and backend contracts.

## Branches And Commits

- Use focused branches for each feature or fix.
- Keep commits small and describe the actual behavior change.
- Do not commit `.env` files, secrets, build output, or local caches.
- If a Prisma migration is required, commit the generated migration directory with the code change.

## Backend Guidelines

- Add new routes under `backend/src/routes`.
- Add input schemas under `backend/src/validators`.
- Routes that accept input should use `validate.middleware.js`.
- Business logic should live in `services/` when it is reusable or non-trivial.
- Controllers should orchestrate request/response handling and call services.
- Protected endpoints must use `auth.middleware.js`; role-restricted endpoints must use `role.middleware.js`.
- Database changes should update `prisma/schema.prisma`, include a migration, and update seed/tests when needed.

## Frontend Guidelines

- API calls should go through `frontend/src/services`.
- Page-level workflows belong in `pages/`; reusable UI belongs in `components/`.
- Shared state should use the existing store/context patterns instead of creating ad hoc globals.
- Pure logic should be extracted to `lib/` or `utils/` so it can be tested.
- Protected routes must use `ProtectedRoute` with the correct required role.
- When adding customer/admin pages, update routing in `App.jsx` and navigation where applicable.

## Documentation

Update documentation when changing:

- Environment variables.
- Important endpoints.
- Auth, queue, booking, checkout, or seatmap workflows.
- Test, build, seed, or crawler commands.

Main documentation:

- Root `README.md`: overview and quick start.
- `docs/SETUP.md`: installation and environment variables.
- `docs/ARCHITECTURE.md`: architecture and modules.
- `docs/API.md`: endpoints and workflows.
- `docs/TESTING.md`: test strategy.
- `docs/OPERATIONS.md`: scripts and operational notes.

## Review Checklist

- The change scope is focused.
- Tests cover new or high-risk logic.
- Validators cover abnormal input.
- Error responses are usable by the frontend.
- Authentication and role checks are correct.
- Realtime event contracts are synchronized across frontend and backend.
- Documentation is updated when behavior or workflows change.

