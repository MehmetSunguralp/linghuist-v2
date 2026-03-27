# Backend Conventions

This document defines the backend coding conventions for `apps/linghuist-v2/src/app`.

## API Responses

- HTTP success responses must use this envelope shape:
  - `{ message: string, data: T }`
- Throw Nest exceptions for errors; do not return custom error payloads from controllers/services.
- Keep user-facing exception messages short and clear.

## Error Handling and Logging

- Log detailed server diagnostics with structured fields.
- Use the same baseline log fields when logging errors:
  - `context`: service or class/method name
  - `event`: short event identifier
  - `message`: technical detail for server logs
  - optional IDs: `userId`, `chatId`, `notificationId`, etc.
- Throw simple user-facing exception messages after logging internal details.
- Avoid leaking provider internals to users (DB/provider raw error messages should stay in logs).

## Types and DTO Placement

- Request/response DTOs remain under feature `dto/` directories.
- Reusable feature-local types should live under feature `types/`.
- Cross-feature reusable types should live under `common/types/`.
- Avoid defining reusable object types inline in controllers/services.

## Helpers and Utils Placement

- Reusable feature-local helpers should live under feature `utils/`.
- Cross-feature helpers should live under `app/util/`.
- Keep helper files focused by concern (validation, mapping, formatting, etc).

## Service Structure

- Prefer focused services over one large, mixed-concern file.
- If a service grows with unrelated responsibilities, split logic into focused domain service files and keep a small orchestrator service.
- Add short intent-level comments for non-trivial service methods.
