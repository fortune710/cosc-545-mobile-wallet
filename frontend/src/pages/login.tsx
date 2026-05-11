import { useState } from 'react'
import {
  IconAlertTriangle,
  IconEye,
  IconEyeOff,
  IconQrcode,
  IconShieldLock,
} from '@tabler/icons-react'
import { Navigate, Link, useSearchParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { REGEXP_ONLY_DIGITS } from 'input-otp'
import { AuthLayout } from '@/components/auth/auth-layout'

import { useLoginStart, useLoginVerifyMfa } from '@/hooks/use-login'
import { authService } from '@/services/auth-service'
import { signInSchema } from '@/lib/schemas/auth'
import logger from '@/lib/logger'

type LoginMode = 'email' | 'mfa' | 'mfa-setup-scan' | 'mfa-setup-verify'

export function LoginPage() {
  const [searchParams] = useSearchParams()
  const loginStartMutation = useLoginStart()
  const loginVerifyMutation = useLoginVerifyMfa()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [flowToken, setFlowToken] = useState('')
  const [provisioningUrl, setProvisioningUrl] = useState('')
  const [redirectTo, setRedirectTo] = useState<string | null>(null)
  const [mode, setMode] = useState<LoginMode>('email')

  const emailIsValid = email.length > 0 ? signInSchema.shape.email.safeParse(email).success : true
  const emailFormValid = emailIsValid && password.trim().length > 0
  const canSubmitEmail = emailFormValid && !loginStartMutation.isPending
  const canSubmitMfa = mfaCode.length === 6 && !loginVerifyMutation.isPending

  const returnTo = (() => {
    const rawValue = searchParams.get('returnTo')
    if (!rawValue) return '/home'
    if (!rawValue.startsWith('/') || rawValue.startsWith('//')) return '/home'
    return rawValue
  })()

  const handleEmailSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!canSubmitEmail) return

    setErrorMessage('')
    logger.info({ email }, 'Login step 1 attempt')

    try {
      const response = await loginStartMutation.mutateAsync({ email, password })

      if (response.email_verification_required) {
        setRedirectTo(`/verify-email?email=${encodeURIComponent(response.email ?? email)}`)
        return
      }

      if (response.mfa_setup_required) {
        setFlowToken(response.flow_token ?? '')
        setProvisioningUrl(response.provisioning_url ?? '')
        setMode('mfa-setup-scan')
        return
      }

      setFlowToken(response.flow_token ?? '')
      setMode('mfa')
    } catch (error: any) {
      logger.error({ email, error }, 'Login step 1 failed')

      const status = error?.response?.status
      if (status === 403) {
        const detail = error?.response?.data?.detail || ''
        if (detail.includes('locked')) setErrorMessage('Too many failed attempts. Your account is temporarily locked.')
        else setErrorMessage('Access denied. Please try again.')
      } else {
        setErrorMessage('Invalid email or password.')
      }
    }
  }

  const handleLoginMfaSubmit = async () => {
    if (!canSubmitMfa) return
    setErrorMessage('')

    try {
      await loginVerifyMutation.mutateAsync({ flow_token: flowToken, mfa_code: mfaCode })
      logger.info('Login MFA successful')

      try {
        const pinStatus = await authService.getPinPresence()
        setRedirectTo(pinStatus.has_pin ? returnTo : `/set-pin?returnTo=${encodeURIComponent(returnTo)}`)
      } catch {
        setRedirectTo(returnTo)
      }
    } catch (error: any) {
      setMfaCode('')
      logger.error({ error }, 'Login MFA verification failed')
      setErrorMessage('Invalid verification code. Please try again.')
    }
  }

  const handleBack = () => {
    setErrorMessage('')
    setMfaCode('')
    if (mode === 'mfa-setup-verify') {
      setMode('mfa-setup-scan')
      return
    }
    setMode('email')
    setFlowToken('')
    setProvisioningUrl('')
  }

  if (redirectTo) return <Navigate to={redirectTo} replace />

  return (
    <AuthLayout>
      <div className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-10 md:px-12 lg:px-16 xl:px-20">
        {mode === 'email' ? (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
                Welcome back.
              </h1>
              <p className="mt-2 text-[15px] text-zinc-500 dark:text-zinc-400">
                Sign in to your secure wallet with verified protection.
              </p>
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-5" noValidate>
              <div>
                <Label htmlFor="email" className="mb-1.5 block text-[13px] font-semibold text-zinc-700 dark:text-zinc-300">
                  Email address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-[15px] text-zinc-900 placeholder:text-zinc-400 transition-all focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-violet-600 dark:focus:bg-zinc-800"
                  placeholder="name@example.com"
                />
                {email.length > 0 && !emailIsValid && (
                  <p className="mt-1.5 text-[12px] text-red-500">Please enter a valid email address.</p>
                )}
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <Label htmlFor="password" className="block text-[13px] font-semibold text-zinc-700 dark:text-zinc-300">
                    Password
                  </Label>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 pr-11 text-[15px] text-zinc-900 placeholder:text-zinc-400 transition-all focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-white dark:focus:border-violet-600 dark:focus:bg-zinc-800"
                    placeholder="••••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                  </button>
                </div>
              </div>

              {errorMessage && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
                  <IconAlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={!canSubmitEmail}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 text-[15px] font-semibold text-white shadow-sm transition-all enabled:hover:bg-violet-700 enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loginStartMutation.isPending ? 'Signing in…' : 'Sign In'}
              </button>
            </form>

            <p className="mt-8 text-center text-[14px] text-zinc-500 dark:text-zinc-400">
              Don&apos;t have an account?{' '}
              <Link to="/signup" className="font-semibold text-violet-600 hover:underline dark:text-violet-400">
                Create one
              </Link>
            </p>
          </>
        ) : mode === 'mfa-setup-scan' ? (
          <div className="flex flex-col items-center text-center">
            <div className="grid size-16 place-items-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400">
              <IconQrcode size={32} strokeWidth={1.5} />
            </div>
            <h1 className="mt-5 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
              Set up authenticator
            </h1>
            <p className="mt-2 max-w-xs text-[14px] text-zinc-500 dark:text-zinc-400">
              Scan this QR code with your authenticator app, then continue to confirm it.
            </p>

            <div className="mt-8 inline-block rounded-2xl border border-zinc-100 bg-white p-5 shadow-md dark:border-zinc-800 dark:bg-zinc-900">
              {provisioningUrl ? (
                <QRCodeSVG value={provisioningUrl} size={160} />
              ) : (
                <div className="size-40 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
              )}
            </div>

            <button
              onClick={() => setMode('mfa-setup-verify')}
              disabled={!provisioningUrl}
              className="mt-7 flex h-11 w-full max-w-xs items-center justify-center rounded-xl bg-violet-600 text-[15px] font-semibold text-white shadow-sm transition-all enabled:hover:bg-violet-700 enabled:active:scale-[0.98] disabled:opacity-50"
            >
              I&apos;ve scanned it
            </button>

            <button
              onClick={handleBack}
              className="mt-4 text-[13px] font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition-colors"
            >
              ← Back
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center">
            <div className="grid size-16 place-items-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400">
              <IconShieldLock size={32} strokeWidth={1.5} />
            </div>
            <h1 className="mt-5 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
              {mode === 'mfa' ? 'Two-factor verification' : 'Confirm authenticator'}
            </h1>
            <p className="mt-2 max-w-xs text-[14px] text-zinc-500 dark:text-zinc-400">
              Enter the 6-digit code from your authenticator app
            </p>

            <div className="mt-8 flex justify-center">
              <InputOTP
                maxLength={6}
                value={mfaCode}
                onChange={setMfaCode}
                pattern={REGEXP_ONLY_DIGITS}
                autoFocus
              >
                <InputOTPGroup className="gap-2">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot
                      key={i}
                      index={i}
                      className="size-12 rounded-xl border border-zinc-200 bg-zinc-50 text-base font-bold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white data-[active=true]:border-violet-500 data-[active=true]:ring-2 data-[active=true]:ring-violet-200 dark:data-[active=true]:border-violet-400"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>

            {errorMessage && (
              <p className="mt-4 text-[13px] font-medium text-red-500">{errorMessage}</p>
            )}

            <button
              onClick={handleLoginMfaSubmit}
              disabled={!canSubmitMfa}
              className="mt-7 flex h-11 w-full max-w-xs items-center justify-center rounded-xl bg-violet-600 text-[15px] font-semibold text-white shadow-sm transition-all enabled:hover:bg-violet-700 enabled:active:scale-[0.98] disabled:opacity-50"
            >
              {loginVerifyMutation.isPending ? 'Verifying…' : 'Verify'}
            </button>

            <button
              onClick={handleBack}
              className="mt-4 text-[13px] font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition-colors"
            >
              ← Back
            </button>
          </div>
        )}
      </div>
    </AuthLayout>
  )
}
