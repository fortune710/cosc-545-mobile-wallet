# SecureWallet Agent Guide

## Product Context
- Build a web-based, mobile-responsive micro-payment wallet called `SecureWallet`.
- Transaction scope is micro-payments only: individual transfers must stay between `$0.01` and `$50.00`.
- The current phase is a local-development-first stack with a React frontend and a Dockerized Django + Postgres backend.
- Native mobile apps, multi-currency support, lending, merchant accounts, ACH withdrawals, and ML fraud detection are out of scope for now.

## Non-Negotiable Security Priorities
- Treat security requirements as first-class product requirements, not follow-up work.
- MFA is mandatory for all wallet access.
- Never design flows that expose whether an email is registered.
- Audit logs must be append-only at the application layer and must not expose delete or update paths.
- Avoid trusting client-supplied identity, role, transaction amount, or authorization context.
- Default toward server-side validation, least privilege, tamper resistance, and explicit auditability.

## Backend Guidance
- Keep the Django backend API-first.
- Prefer DRF serializers, permissions, and explicit schemas for every endpoint.
- Use decimal-safe handling for money and validate business limits on the server.
- Keep user-bound queries derived from the authenticated session, not caller-supplied identifiers.
- When adding auth or wallet features, preserve a clean separation between:
  - authentication and MFA
  - wallet ledger and balances
  - payment requests and transfers
  - audit logging and suspicious-activity monitoring

## Frontend Guidance
- The frontend should remain mobile-responsive and optimized for clear financial actions.
- Favor explicit confirmation steps for money movement.
- Never rely on client-side validation as the final enforcement layer.
- Treat all user-facing error messages around auth and signup as enumeration-safe.

## Working Conventions
- Prefer small, composable changes over broad speculative scaffolding.
- Update API docs when endpoints or request/response shapes change.
- Add or update tests alongside backend behavior changes.
- Verify Docker Compose and backend tests after meaningful backend edits when possible.

## Useful Commands
- `make up`
- `make down`
- `make logs`
- `make migrate`
- `make makemigrations`
- `make superuser`
- `make test`
