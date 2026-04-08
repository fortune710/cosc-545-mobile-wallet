# Codex Project Config: SecureWallet

Project: `SecureWallet`
Purpose: secure micro-payment digital wallet with a React frontend and Dockerized Django/Postgres backend.

Current stack:
- Frontend: React + Vite in `frontend/`
- Backend: Django + DRF + drf-spectacular in `backend/`
- Database: Postgres via Docker Compose
- Repo Codex config: `.codex/config.toml`

Primary local commands:
- `make up` to start backend + database
- `make down` to stop containers
- `make logs` to inspect backend/database logs
- `make test` to run backend tests in Docker

Recommended Codex launch:
- `codex --auto-edit` for normal repo work
- `codex --suggest` when you want review before edits
- avoid `--full-auto` unless autonomous command execution is intentional

Codex workflow defaults:
- Prefer normal workspace edits without asking for edit approval
- Ask before destructive actions
- Ask before installs/downloads that need network or elevated access
- Use planning for non-trivial tasks

Implementation defaults for future work:
- Keep backend code under `backend/src/`
- Keep backend tests under `backend/tests/`
- Prefer Docker-based verification for backend tasks
- Preserve API-first backend design
- Document new API routes in the generated schema

Product constraints pulled from the SRD:
- Micro-payments only, with max transfer of `$50`
- MFA required before wallet actions
- Generic auth/signup error messages to prevent enumeration
- Audit log must be append-only
- Third-party payment rail handles card/payment method capture
- Web app only, mobile-responsive, no native app scope in this phase

High-priority future domains:
- Account registration and verification
- MFA enrollment and login
- Wallet top-up and balance management
- Send/request payments
- Transaction history
- Suspicious activity alerts
- RBAC and audit logging

When making product decisions:
- Favor server-side enforcement over client trust
- Favor security and auditability over convenience
- Keep sensitive data exposure minimal in responses, logs, and admin tools
