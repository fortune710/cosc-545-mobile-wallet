import { useMemo, useState } from 'react'
import {
  IconAlertTriangle,
  IconApple,
  IconArrowLeft,
  IconBrandGoogle,
  IconEye,
  IconEyeOff,
  IconHelp,
  IconShieldLock,
} from '@tabler/icons-react'

const APP_NAME = 'SecureWallet'
const MAX_ATTEMPTS = 3
const LOCKOUT_MS = 30_000

const normalizeEmail = (value: string) => value.trim().toLowerCase()
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [lockedUntil, setLockedUntil] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const normalizedEmail = useMemo(() => normalizeEmail(email), [email])
  const emailIsValid = emailRegex.test(normalizedEmail)
  const passwordIsValid = password.trim().length >= 8
  const isLocked = Boolean(lockedUntil && Date.now() < lockedUntil)
  const formIsValid = emailIsValid && passwordIsValid
  const canSubmit = formIsValid && !isLocked && !isSubmitting

  const handleSignIn = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!canSubmit) {
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    await new Promise((resolve) => setTimeout(resolve, 900))

    const mockSuccess =
      normalizedEmail === 'demo@securewallet.app' && password === 'Wallet@123'

    if (mockSuccess) {
      setFailedAttempts(0)
      setIsAuthenticated(true)
      setIsSubmitting(false)
      return
    }

    const nextAttempts = failedAttempts + 1
    setFailedAttempts(nextAttempts)
    setErrorMessage('Invalid sign-in details.')

    if (nextAttempts >= MAX_ATTEMPTS) {
      setLockedUntil(Date.now() + LOCKOUT_MS)
      setErrorMessage('Too many attempts. Please wait before trying again.')
    }

    setIsSubmitting(false)
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setPassword('')
    setErrorMessage('')
  }

  if (isAuthenticated) {
    return (
      <main className="min-h-screen bg-[#080b12] text-white">
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
          <section className="rounded-3xl border border-white/10 bg-[#101520] p-6 shadow-2xl">
            <p className="text-sm text-slate-400">Welcome back</p>
            <h1 className="mt-2 text-3xl font-bold">You have signed in securely.</h1>
            <div className="mt-6 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-5">
              <p className="text-sm text-slate-300">Wallet balance</p>
              <p className="mt-1 text-3xl font-semibold">$1,248.30</p>
            </div>
            <button
              onClick={handleLogout}
              className="mt-6 w-full rounded-2xl border border-white/20 px-4 py-3 text-sm font-medium hover:bg-white/5"
            >
              Logout
            </button>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#05070d] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-8 sm:px-6">
        <section className="rounded-[2rem] border border-white/10 bg-[#0e121b] p-6 shadow-2xl">
          <div className="mb-8 flex items-center justify-between text-slate-400">
            <IconArrowLeft size={20} aria-hidden="true" />
            <p className="text-xs tracking-[0.2em]">9:41</p>
            <IconHelp size={20} aria-label="Help" />
          </div>

          <h1 className="text-3xl font-bold leading-tight">
            Welcome back to {APP_NAME}.
          </h1>
          <p className="mt-3 text-sm text-slate-400">
            Sign in securely to continue to your wallet.
          </p>

          <form onSubmit={handleSignIn} className="mt-7 space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="mb-2 block text-sm text-slate-300">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="w-full rounded-2xl border border-white/15 bg-[#131a26] px-4 py-3 text-sm outline-none transition focus:border-blue-400"
                placeholder="you@example.com"
              />
              {email.length > 0 && !emailIsValid ? (
                <p className="mt-2 text-xs text-rose-400">Please enter a valid email address.</p>
              ) : null}
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm text-slate-300">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full rounded-2xl border border-white/15 bg-[#131a26] px-4 py-3 pr-12 text-sm outline-none transition focus:border-blue-400"
                  placeholder="Minimum 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                </button>
              </div>
              {password.length > 0 && !passwordIsValid ? (
                <p className="mt-2 text-xs text-rose-400">Password must be at least 8 characters.</p>
              ) : null}
            </div>

            <div className="flex justify-end">
              <a href="#" className="text-sm text-blue-400 hover:text-blue-300">
                Forgot password?
              </a>
            </div>

            {errorMessage ? (
              <p className="flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                <IconAlertTriangle size={16} /> {errorMessage}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={!canSubmit}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-500 px-4 py-3 text-sm font-semibold transition enabled:hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
              {!isSubmitting ? <IconShieldLock size={16} /> : null}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-slate-500">or continue with</span>
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <div className="space-y-3">
            <button className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-medium hover:bg-white/10">
              <IconBrandGoogle size={18} /> Continue with Google
            </button>
            <button className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-medium hover:bg-white/10">
              <IconApple size={18} /> Continue with Apple
            </button>
          </div>

          <p className="mt-8 text-center text-sm text-slate-400">
            Don&apos;t have an account?{' '}
            <a href="#" className="text-blue-400 hover:text-blue-300">
              Create one
            </a>
          </p>
        </section>
      </div>
    </main>
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom"

import { TabBar } from "@/components/tab-bar"
import { Toaster } from "@/components/ui/sonner"
import { AddBalancePage } from "@/pages/add-balance"
import { MorePage } from "@/pages/more"
import { RecipientsPage } from "@/pages/recipients"
import { NotificationsPage } from "@/pages/notifications"
import { HistoryPage } from "@/pages/history"
import { HomePage } from "@/pages/home"
import { ReceivePage } from "@/pages/receive"
import { SendPage } from "@/pages/send"
import { TransactionsPage } from "@/pages/transactions"

function AppShell() {
  const { pathname } = useLocation()
  const hideTabBar = ["/add-balance", "/send", "/receive", "/notifications", "/history"].includes(pathname)

  return (
    <div className="min-h-svh bg-white text-zinc-950">
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/add-balance" element={<AddBalancePage />} />
        <Route path="/send" element={<SendPage />} />
        <Route path="/receive" element={<ReceivePage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/recipients" element={<RecipientsPage />} />
        <Route path="/more" element={<MorePage />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>

      {hideTabBar ? null : <TabBar />}
      <Toaster richColors closeButton />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}
