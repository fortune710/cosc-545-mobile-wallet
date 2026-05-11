```
## Functional Requirements

### Account Registration
- Accept emails conforming to RFC 5322
- Reject registration from known disposable/temporary email domains (e.g., mailinator.com, guerrillamail.com)
- Reject passwords shorter than 12 characters or in the top 10,000 most common passwords
- Send a verification email upon submission
- Keep accounts inactive until the verification link is clicked; links expire after 24 hours
- Return a generic message on signup regardless of whether the email is already registered

### MFA Enrollment
- Generate a unique TOTP seed shown as a QR code and plain text string
- Confirm enrollment only after the user enters a valid TOTP code
- Provide 8 one-time recovery codes (16 alphanumeric characters each), shown once and stored as hashes
- Block all payment actions until MFA enrollment is complete

### Login
- Require email, password, and TOTP code in sequence
- Lock the account for 30 minutes after 5 consecutive failed attempts within 15 minutes
- Log lockout events and send a notification email to the account holder
- Send a security notification after 3 or more failed login attempts on an account
- Create session tokens that expire after 8 hours; invalidate immediately on logout
- Never indicate which factor was wrong in error messages

### Send a Payment
- Accept a recipient (username or email), an amount between $0.01 and $50.00, and an optional memo up to 100 characters
- Show a confirmation screen with recipient display name, exact amount, and memo before finalizing
- Require a separate confirmation button press before moving funds
- Complete confirmed transactions within 5 seconds at the 95th percentile
- Debit the sender and credit the recipient atomically
- Send in-app and email notifications to both users within 30 seconds

### Request a Payment
- Send an email and in-app notification to the target user on request creation
- Allow the target user to approve or decline directly from the notification
- Notify the requester of a decline within 30 seconds
- Expire unacted requests after 72 hours and mark them accordingly in both users' history

### Session Management
- Allow users to view all active and past sessions associated with their account
- Display per session: browser, operating system, IP address, and sign-in timestamp
- Highlight the current device in the session list

### Transaction History
- Display transactions in reverse chronological order
- Show date/time (UTC), type, counterparty display name, amount, memo, and status per entry
- Support filtering by date range, transaction type, and amount range
- Load results within 2 seconds for up to 24 months of data
- Prevent any user from deleting, editing, or modifying any transaction record

### Top Up Wallet Balance
- Accept top-up amounts from $1.00 to $500.00 per transaction
- Reflect a successful top-up in the balance within 10 seconds of confirmation
- Show a clear error message on failure without changing the balance

### Suspicious Activity Notification
- Send an in-app alert on: login from a new device or location, more than 3 failed login attempts, a transaction over $25 to a first-time recipient, or more than 5 transactions within 10 minutes
- Include event type, timestamp, and a link to review or lock the account in every alert
- Log flagged transactions without automatically blocking them

---

## Non-Functional Requirements

### Authentication & Session Management
- Require at least two authentication factors for any wallet access
- Support TOTP (RFC 6238) with a 30-second time step and 1-step clock drift tolerance
- Lock accounts for 30 minutes after 5 consecutive failures within 15 minutes; auto-unlock after 30 minutes
- Rate-limit login attempts to 20 per hour per client IP address; also rate-limit to 20 per hour per device fingerprint (X-Device-ID header) to block attackers who rotate IPs
- Record session metadata (IP address, User-Agent, device fingerprint) on every login and expose the session list to the authenticated user
- Invalidate session tokens immediately on logout; return HTTP 401 within 500ms for invalidated tokens
- Enforce an 8-hour maximum session lifetime server-side
- Store passwords using Argon2id as the primary hashing algorithm with PBKDF2 as fallback; never plaintext
- Reject passwords found in the top 10,000 most common passwords list at registration and password change
- Email the account owner upon a login from an unrecognized device or IP subnet

### Authorization
- Enforce three-role RBAC (User, Support Agent, System Administrator) server-side on every request
- Return HTTP 403 when a User-role token attempts to access another user's data
- Ignore any role claims supplied by the client in headers or request body
- Bind all data queries to the authenticated user to prevent IDOR attacks
- Require supervisory approval before a Support Agent can view counterparty names on transactions

### Confidentiality
- Enforce TLS 1.2 or later on all connections; disable TLS 1.0 and 1.1
- Filter API responses to include only fields required for the operation; never expose internal IDs or password hashes

### Data Integrity
- Make transaction records immutable; return HTTP 405 for any PUT or DELETE on a transaction
- Assign each transaction a monotonically increasing per-wallet sequence number; enforce uniqueness at the database level
- Link each transaction record to the previous one via a SHA-256 hash chain: store `previous_hash` and `record_hash` (SHA-256 of the canonical payload) on every record
- Sign each transaction's record hash with an HMAC-SHA-256 `chain_signature` using a server-side secret inaccessible to application read paths
- Lock transaction records as immutable once finalized; reject any field modification or deletion on locked records at the model layer
- Provide a chain-verification routine that checks sequence continuity, previous-hash linkage, record-hash correctness, and chain-signature validity for every wallet
- Persist signed chain checkpoints to durable storage after each successful transaction to enable offline integrity auditing
- Validate all monetary amounts server-side as positive fixed-point decimals with exactly 2 decimal places, between $0.01 and $50.00
- Run all balance-modifying writes inside serializable database transactions with full rollback on failure
- Require a UUID v4 idempotency key on every payment operation; reject duplicates without reprocessing

### Audit Logging
- Log every authentication event with: UTC timestamp (millisecond precision), user ID, event type, result, and source IP — within 1 second
- Log every financial operation with: UTC timestamp, user ID, transaction ID, operation type, amount, and result — within 1 second
- Sign all audit log entries with an HMAC key, inaccessible to log-reading application code
- Make the audit log append-only at the application layer; expose no delete or update operations on log records
- Emit all audit events as structured JSON log records (timestamp, level, logger, event type, actor ID, status, subsystem, metadata) to support machine-readable ingestion
- Automatically redact sensitive fields (passwords, tokens, balances, PII, card data) from all log output; only explicitly allow-listed metadata fields may appear in audit log entries
- Forward structured audit log output to a SIEM platform (Wazuh) for real-time correlation and alerting
- Exclude PII, payment amounts, and session tokens from all debug and error logs
- Alert on: login failures detected per account, account lockouts after repeated failures, and MFA verification failures

### Availability & Performance
- Maintain 99.5% monthly uptime (≤3.65 hours downtime), excluding maintenance windows announced 48 hours in advance
- Rate-limit authenticated payment endpoints to 10 requests per session per minute; return HTTP 429 on breach
- Return all non-payment API responses within 2 seconds
- Reflect top-up balance changes within 10 seconds of confirmation
- Deliver in-app and email notifications within 30 seconds of a completed transaction
- Fire security alerts within 5 minutes of a qualifying event

### Non-Repudiation
- Generate a digitally signed receipt per completed transaction containing: transaction ID, sender ID, recipient ID, amount, UTC timestamp (millisecond precision), and SHA-256 hash of the transaction record
- Log payment initiation and payment confirmation as two separate audit events; an unconfirmed payment must not appear as complete

### Usability & Accessibility
- Make all interactive elements fully operable by keyboard
- Never use color as the sole means of conveying status; always include a text label
- Support screens as narrow as 375px without horizontal scrolling
- Show validation errors inline with a description of what a valid input looks like
- Use financial terms (balance, top up, send, request) consistently across all screens and notifications
```
