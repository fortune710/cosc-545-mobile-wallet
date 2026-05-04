# SecureWallet Sign In UI (Frontend Prototype)

A mobile-first, dark fintech-style sign-in screen built with React + Vite + Tailwind CSS.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## Demo credentials

- Email: `demo@securewallet.app`
- Password: `Wallet@123`

## Security notes (prototype)

- No password/token storage in `localStorage`.
- Sign-in disabled until email/password pass validation.
- Generic sign-in errors to reduce account enumeration hints.
- Mock lockout after 3 failed attempts and temporary cooldown.
- Protected dashboard is state-gated in UI only.

## Real production requirements

- Use backend auth (Supabase Auth or Firebase Auth).
- Enforce rate limiting and lockouts server-side.
- Require MFA for wallet/payment actions.
- Use secure cookies (`HttpOnly`, `Secure`, `SameSite`) and HTTPS.
- Add server-side validation, audit logs, and session monitoring.
