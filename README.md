# SecureWallet

SecureWallet is a web-based, mobile-responsive micro-payment wallet. The app is being built as a React frontend with a Dockerized Django + Postgres backend.

This repository is currently focused on the foundation for local development:
- React + Vite frontend in `frontend/`
- Django + DRF backend in `backend/`
- Postgres database via Docker Compose
- OpenAPI schema generation and Swagger UI with `drf-spectacular`

## Product Direction

The current implementation is guided by the SecureWallet SRD:
- micro-payments only
- transfer limit of `$50.00` per payment
- MFA required before wallet actions
- append-only audit logging
- enumeration-safe authentication and signup flows
- web application only for this phase, with mobile-responsive UX

Out of scope for now:
- native iOS or Android apps
- multi-currency support
- lending or credit features
- merchant/business accounts
- ML-based fraud detection

## Repository Layout

```text
.
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── scripts/
│   ├── src/
│   │   ├── config/
│   │   └── core/
│   └── tests/
├── .codex/
│   ├── README.md
│   └── project.md
├── frontend/
├── docker-compose.yml
├── Makefile
└── AGENTS.md
```

## Local Development

### Backend

1. Copy `.env.example` to `.env`.
2. Start the backend stack:

```bash
make up
```

3. Useful backend URLs:
- health: `http://localhost:8000/api/health/`
- OpenAPI schema: `http://localhost:8000/api/schema/`
- Swagger UI: `http://localhost:8000/api/docs/`
- Django admin: `http://localhost:8000/admin/`

### Frontend

The frontend currently runs outside Docker. Start it from the `frontend/` directory using the package manager your team prefers for the Vite app. The backend is configured to allow requests from `http://localhost:5173` by default.

## Common Commands

- `make up` starts Django and Postgres with Docker Compose
- `make down` stops the backend stack
- `make logs` tails backend and database logs
- `make monitor-init` generates Wazuh TLS certificates
- `make monitor-up` starts the Wazuh stack
- `make monitor-down` stops the Wazuh stack
- `make monitor-logs` tails Wazuh logs
- `make shell` opens a shell in the backend container
- `make migrate` runs Django migrations
- `make makemigrations` creates new migrations
- `make superuser` creates a Django admin user
- `make test` runs the backend test suite

## Backend Notes

- Backend code lives under `backend/src/`
- Backend tests live under `backend/tests/`
- The backend is API-first and uses Django REST Framework
- Swagger/OpenAPI is generated with `drf-spectacular`
- Postgres is the default development database

## Wazuh Monitoring

The local stack now includes a single-node Wazuh deployment plus a containerized agent for Docker and SecureWallet log ingestion.

Before first startup on Linux, set the required kernel map count:

```bash
sudo sysctl -w vm.max_map_count=262144
```

Then start the stack:

```bash
make up
```

`make up` generates self-signed Wazuh certificates on first run using `monitoring/wazuh/generate-indexer-certs.yml`.

Local access:
- Wazuh dashboard: `https://localhost:8443`
- Wazuh API: `https://localhost:55000`
- Wazuh indexer: `https://localhost:9200`

Default Wazuh credentials come from `.env.example` and should be overridden in `.env` for any non-throwaway environment.

SecureWallet backend security logs are mirrored to:
- `var/log/backend/securewallet.app.jsonl`
- `var/log/backend/securewallet.audit.jsonl`

The Wazuh manager includes local rules for SecureWallet auth and wallet audit activity, and the agent watches Docker container logs, selected host logs under `/var/log`, repo paths for file integrity monitoring, and SecureWallet structured backend logs.

## Current API Surface

- `GET /api/health/` returns a simple service health payload
- `GET /api/schema/` returns the OpenAPI schema
- `GET /api/docs/` serves Swagger UI

## Security Expectations

Security work is part of the product, not a later hardening pass. As this app grows, keep these expectations intact:
- validate sensitive behavior server-side
- never trust client-supplied roles or ownership
- keep auth and signup errors generic
- document and test API behavior as it evolves
- preserve auditability for sensitive actions
