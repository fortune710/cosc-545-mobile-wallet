# SecureWallet Codex Notes

Use `AGENTS.md` as the primary repo-wide instruction file.

## Files
- `.codex/config.toml`: repo-local Codex configuration defaults
- `.codex/project.md`: project context and product constraints
- `.codex/README.md`: Codex workflow and safety notes

## Recommended Launch Mode
- Prefer `codex --auto-edit` for normal repo work.
- Use `codex --suggest` when you want review-before-edit behavior.
- Use `codex --full-auto` only when you explicitly want autonomous sandboxed execution.

## Quick Context
- SecureWallet is a web-based micro-payment wallet.
- Keep payments within the SRD limit of `$50` per transfer.
- MFA, auditability, and enumeration-safe auth flows are mandatory.
- The current stack is React frontend plus Dockerized Django/Postgres backend.

## Working Defaults
- Backend code lives in `backend/src/`
- Backend tests live in `backend/tests/`
- Prefer Docker-based backend verification.
- Keep the backend API-first and schema-documented.

## Safety Expectations
- Do not ask for approval for normal repo edits inside the writable workspace.
- Do ask before destructive actions such as deletes, resets, overwrites with data loss risk, or irreversible database operations.
- Do ask before install/download actions when they require network access or elevated permissions.
- Treat sandbox, escalation, and approval rules enforced by the Codex harness as higher priority than repo notes.

## Planning Expectations
- Use a real plan for non-trivial or multi-step tasks.
- Skip plans for trivial one-step work.
- Keep plans updated as work progresses instead of writing them once and ignoring them.

## Note On Config
- `.codex/config.toml` currently mirrors the known local Codex TOML structure.
- Official Codex docs I could confirm describe approval modes as runtime choices such as `--suggest`, `--auto-edit`, and `--full-auto`.
- Sandbox mode, approval prompts, and destructive-action confirmation appear to be primarily controlled by the Codex runtime/harness, not just by repo TOML keys.
- Because of that, this repo stores the safety policy here in documentation so the intent is explicit even if a given Codex build ignores extra config keys.
