# SecureWallet Security & Profile Demo (React + Vite + Tailwind)

A mobile-first fintech UI demo with secure frontend behavior for professor testing.

## 1) Project setup commands

```bash
npm install
npm run dev
```

If you are creating this from scratch:

```bash
npm create vite@latest securewallet-demo -- --template react
cd securewallet-demo
npm install
npm install -D tailwindcss @tailwindcss/vite
npm install lucide-react
```

## 2) Folder structure

```text
frontend/
  src/
    App.tsx
    index.css
    main.tsx
  package.json
  vite.config.ts
  README.md
```

## 3) Tailwind setup

This project already has Tailwind configured with:
- `@tailwindcss/vite` in `vite.config.ts`
- `@import "tailwindcss";` in `src/index.css`

## 4) Included screens

- Demo menu (Profile / PIN Info / Change Password)
- PIN Information screen
- Enter Current PIN screen (4-digit keypad, lockout after failed attempts)
- Create New PIN screen (weak PIN blocking)
- Change Password screen (visibility toggles + strength validation)
- Profile / Personal Details screen (editable usertag + close-account confirmation modal)

## 5) Local run instructions

```bash
npm install
npm run dev
```

Open the local URL shown in terminal (usually `http://localhost:5173`).

## 6) GitHub upload instructions

```bash
git init
git add .
git commit -m "Build SecureWallet security and profile mobile UI demo"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

## 7) Vercel deployment instructions

1. Push project to GitHub.
2. Go to Vercel dashboard and click **Add New Project**.
3. Import your GitHub repository.
4. Framework preset: **Vite**.
5. Build command: `npm run build`
6. Output directory: `dist`
7. Click **Deploy**.

## 8) Security checklist (frontend demo)

- [x] No PIN/password saved to localStorage
- [x] No console logging of PIN/password
- [x] Continue/submit buttons disabled until valid
- [x] PIN attempts limited + temporary lockout after 3 failures
- [x] Generic, safe error messages
- [x] No dangerous HTML injection APIs used
- [x] Close Account action requires confirmation modal
- [x] No real user data included (sample data only)

## 9) Real backend security requirements (must-have in production)

- PIN and password verification must happen server-side only
- PIN/password must be hashed at rest
- Sensitive changes must require re-authentication
- MFA should be required before PIN/password change
- Backend rate-limiting + server-side lockout policies
- Secure session cookies (HttpOnly + Secure + SameSite)
- HTTPS only
- Profile data served from protected API endpoints
- Account closure must require identity confirmation

## 10) How to present to your professor

- Start on the menu screen and show each flow.
- Enter wrong PIN 3 times to demonstrate lockout behavior.
- Show weak PIN rejection (`1234`, `0000`, etc.).
- Show password validation for strong password rules.
- Show usertag edit validation and close-account confirmation modal.
- Explain clearly: this is **frontend UX + guardrails**, while real security is enforced in backend authentication, authorization, hashing, MFA, and rate limiting.
