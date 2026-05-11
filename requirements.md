```
## Functional Requirements

### Account Registration
- Accept emails conforming to RFC 5322
- Reject passwords shorter than 12 characters or in the top 10,000 most common passwords
- Send a verification email within 60 seconds of submission
- Keep accounts inactive until the verification link is clicked; links expire after 24 hours
- Return a generic message on signup regardless of whether the email is already registered

### MFA Enrollment
- Generate a unique TOTP seed shown as a QR code and plain text string
- Confirm enrollment only after the user enters a valid TOTP code
- Provide 6–10 one-time recovery codes (16 alphanumeric characters each), shown once and stored as hashes
- Block all payment actions until MFA enrollment is complete

### Login
- Require email, password, and TOTP code in sequence
- Lock the account for 30 minutes after 5 consecutive failed attempts within 15 minutes
- Log lockout events and send a notification email to the account holder
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

### Transaction History
- Display transactions in reverse chronological order
- Show date/time (UTC), type, counterparty display name, amount, memo, and status per entry
- Support filtering by date range, transaction type, and amount range
- Load results within 2 seconds for up to 24 months of data
- Prevent any user from deleting, editing, or modifying any transaction record

### Top Up Wallet Balance
- Link payment methods through the third-party payment rail's hosted fields; raw card data must never touch the application server
- Accept top-up amounts from $1.00 to $500.00 per transaction
- Reflect a successful top-up in the balance within 10 seconds of payment rail confirmation
- Show a clear error message on failure without changing the balance

### Suspicious Activity Notification
- Send an email alert on: login from a new device or location, more than 3 failed login attempts, a transaction over $25 to a first-time recipient, or more than 5 transactions within 10 minutes
- Include event type, timestamp, and a link to review or lock the account in every alert
- Log flagged transactions without automatically blocking them

---

## Non-Functional Requirements

### Authentication & Session Management
- Require at least two authentication factors for any wallet access
- Support TOTP (RFC 6238) with a 30-second time step and 1-step clock drift tolerance
- Lock accounts for 30 minutes after 5 consecutive failures within 15 minutes; auto-unlock after 30 minutes
- Invalidate session tokens immediately on logout; return HTTP 401 within 500ms for invalidated tokens
- Enforce an 8-hour maximum session lifetime server-side
- Store passwords as bcrypt (cost ≥12) or Argon2id (memory ≥64 MB, iterations ≥3) hashes; never plaintext
- Reject passwords found in the top 10,000 most common passwords list at registration and password change
- Email the account owner within 60 seconds of a login from an unrecognized device or IP subnet

### Authorization
- Enforce three-role RBAC (User, Support Agent, System Administrator) server-side on every request
- Return HTTP 403 when a User-role token attempts to access another user's data
- Ignore any role claims supplied by the client in headers or request body
- Bind all data queries to the authenticated user's session ID to prevent IDOR attacks
- Require supervisory approval before a Support Agent can view transaction memos or counterparty names

### Confidentiality
- Enforce TLS 1.2 or later on all connections; disable TLS 1.0 and 1.1
- Encrypt wallet balances and transaction amounts at rest with AES-256-GCM using per-user KMS keys
- Encrypt all PII (name, email, phone, payment method tokens) at rest with AES-256-GCM
- Filter API responses to include only fields required for the operation; never expose internal IDs, password hashes, or KMS key references
- Implement HSTS with a max-age of at least 31,536,000 seconds including subdomains
- Never store, log, or transmit raw card numbers, CVVs, or expiry dates

### Data Integrity
- Make transaction records immutable; return HTTP 405 for any PUT or DELETE on a transaction
- Link each transaction record to the previous one via a SHA-256 hash chain to make tampering detectable
- Validate all monetary amounts server-side as positive fixed-point decimals with exactly 2 decimal places, between $0.01 and $50.00
- Run all balance-modifying writes inside serializable database transactions with full rollback on failure
- Require a UUID v4 idempotency key on every payment operation; reject duplicates without reprocessing

### Audit Logging
- Log every authentication event with: UTC timestamp (millisecond precision), user ID, event type, result, and source IP — within 1 second
- Log every financial operation with: UTC timestamp, user ID, transaction ID, operation type, amount, and result — within 1 second
- Sign all audit log entries with an HMAC key stored in the KMS, inaccessible to log-reading application code
- Make the audit log append-only at the application layer; expose no delete or update operations on log records
- Retain audit log entries for a minimum of 2 years
- Exclude PII, payment amounts, and session tokens from all debug and error logs
- Alert the security team within 5 minutes of: 20+ failed logins across distinct accounts in 60 seconds, 5 failures on one account in 5 minutes, or any write attempt on the audit log table

### Availability & Performance
- Maintain 99.5% monthly uptime (≤3.65 hours downtime), excluding maintenance windows announced 48 hours in advance
- Rate-limit the login endpoint to 10 requests per IP per minute; return HTTP 429 with Retry-After on breach
- Rate-limit authenticated payment endpoints to 10 requests per session per minute; return HTTP 429 on breach
- Run a minimum of 2 application instances behind a load balancer; a single instance failure must not interrupt service beyond 5 seconds
- Run automated database backups every 24 hours, retained for 30 days, restorable to any point within 4 hours
- Complete payment transactions within 5 seconds at the 95th percentile
- Return all non-payment API responses within 2 seconds
- Reflect top-up balance changes within 10 seconds of payment rail confirmation
- Deliver in-app and email notifications within 30 seconds of a completed transaction
- Fire security alerts within 5 minutes of a qualifying event

### Non-Repudiation
- Generate a digitally signed receipt per completed transaction containing: transaction ID, sender ID, recipient ID, amount, UTC timestamp (millisecond precision), and SHA-256 hash of the transaction record
- Store receipts in the audit log; make them accessible only to the owning user and compliance personnel
- Record IP address, User-Agent, screen resolution, and a hash of the session token (not the raw token) for every transaction
- Log payment initiation and payment confirmation as two separate audit events; an unconfirmed payment must not appear as complete

### Usability & Accessibility
- Meet WCAG 2.1 Level AA
- Make all interactive elements fully operable by keyboard
- Associate all form error messages with their inputs via ARIA attributes
- Never use color as the sole means of conveying status; always include a text label
- Support screens as narrow as 375px without horizontal scrolling
- Show validation errors inline with a description of what a valid input looks like
- Warn users 5 minutes before session expiry with a one-click option to extend
- Enable a first-time user to complete registration, MFA enrollment, top-up, and first payment within 3 minutes
- Use financial terms (balance, top up, send, request) consistently across all screens and notifications
```