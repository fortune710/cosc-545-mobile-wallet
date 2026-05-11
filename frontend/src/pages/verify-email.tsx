import { useEffect, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { IconCircleCheck, IconAlertTriangle, IconLoader2, IconMail } from '@tabler/icons-react'
import { AuthLayout } from '@/components/auth/auth-layout'
import { authService } from '@/services/auth-service'

type State = 'loading' | 'pending' | 'success' | 'error'

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const [state, setState] = useState<State>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [infoMessage, setInfoMessage] = useState('')
  const [isResending, setIsResending] = useState(false)
  const [redirectToDashboard, setRedirectToDashboard] = useState(false)
  const [authCheckComplete, setAuthCheckComplete] = useState(!authService.isAuthenticated())

  const token = searchParams.get('token')
  const email = searchParams.get('email')

  useEffect(() => {
    let isActive = true

    if (authService.isAuthenticated()) {
      authService
        .getUser()
        .then((user) => {
          if (isActive && user.emailVerified) {
            setRedirectToDashboard(true)
          }
        })
        .catch(() => {})
        .finally(() => {
          if (isActive) {
            setAuthCheckComplete(true)
          }
        })
    } else {
      setAuthCheckComplete(true)
    }

    return () => {
      isActive = false
    }
  }, [])

  useEffect(() => {
    if (redirectToDashboard || !authCheckComplete) return

    if (!token) {
      setState('pending')
      return
    }

    authService
      .verifyEmail(token)
      .then(() => {
        if (authService.isAuthenticated()) {
          setRedirectToDashboard(true)
          return
        }
        setState('success')
      })
      .catch((err: any) => {
        setState('error')
        setErrorMessage(
          err?.response?.data?.detail || 'This link is invalid or has expired. Please request a new verification email.',
        )
      })
  }, [authCheckComplete, redirectToDashboard, token])

  if (redirectToDashboard) {
    return <Navigate to="/home" replace />
  }

  const handleResend = async () => {
    if (!email || isResending) return
    setInfoMessage('')
    setErrorMessage('')
    setIsResending(true)

    try {
      const response = await authService.resendVerificationEmail(email)
      setInfoMessage(response.detail)
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.detail || 'Unable to resend verification instructions right now.')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <AuthLayout>
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center sm:px-10">
        {state === 'loading' && (
          <>
            <div className="grid size-16 place-items-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400">
              <IconLoader2 size={32} className="animate-spin" strokeWidth={1.5} />
            </div>
            <h1 className="mt-5 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Verifying…</h1>
            <p className="mt-2 text-[14px] text-zinc-500 dark:text-zinc-400">Please wait while we confirm your email.</p>
          </>
        )}

        {state === 'pending' && (
          <>
            <div className="grid size-16 place-items-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400">
              <IconMail size={32} strokeWidth={1.5} />
            </div>
            <h1 className="mt-5 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
              Verify your email
            </h1>
            <p className="mt-2 max-w-sm text-[14px] text-zinc-500 dark:text-zinc-400">
              {email
                ? `We found your account, but you still need to verify ${email} before you can finish signing in. Check your inbox for the latest verification email.`
                : 'Check your inbox for your verification email before you continue signing in.'}
            </p>
            {infoMessage && (
              <p className="mt-4 max-w-sm rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400">
                {infoMessage}
              </p>
            )}
            {errorMessage && (
              <p className="mt-4 max-w-sm rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
                {errorMessage}
              </p>
            )}
            {email && (
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending}
                className="mt-8 flex h-11 w-full max-w-xs items-center justify-center rounded-xl bg-violet-600 text-[15px] font-semibold text-white shadow-sm transition-all enabled:hover:bg-violet-700 enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isResending ? 'Resending…' : 'Resend verification email'}
              </button>
            )}
            <Link
              to="/login"
              className="mt-4 text-[14px] font-medium text-violet-600 transition-colors hover:text-violet-700 dark:text-violet-400"
            >
              Back to sign in
            </Link>
          </>
        )}

        {state === 'success' && (
          <>
            <div className="grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
              <IconCircleCheck size={36} strokeWidth={1.5} />
            </div>
            <h1 className="mt-5 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
              Email verified!
            </h1>
            <p className="mt-2 max-w-xs text-[14px] text-zinc-500 dark:text-zinc-400">
              Your account is active. Sign in to set up MFA and start using your wallet.
            </p>
            <Link
              to="/login"
              className="mt-8 flex h-11 w-full max-w-xs items-center justify-center rounded-xl bg-violet-600 text-[15px] font-semibold text-white shadow-sm transition-all hover:bg-violet-700 active:scale-[0.98]"
            >
              Sign In
            </Link>
          </>
        )}

        {state === 'error' && (
          <>
            <div className="grid size-16 place-items-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">
              <IconAlertTriangle size={32} strokeWidth={1.5} />
            </div>
            <h1 className="mt-5 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
              Verification failed
            </h1>
            <p className="mt-2 max-w-sm text-[14px] text-zinc-500 dark:text-zinc-400">{errorMessage}</p>
            {email && (
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending}
                className="mt-8 flex h-11 w-full max-w-xs items-center justify-center rounded-xl bg-violet-600 text-[15px] font-semibold text-white shadow-sm transition-all enabled:hover:bg-violet-700 enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isResending ? 'Resending…' : 'Resend verification email'}
              </button>
            )}
            <Link
              to="/login"
              className="mt-4 text-[14px] font-medium text-violet-600 transition-colors hover:text-violet-700 dark:text-violet-400"
            >
              Back to sign in
            </Link>
          </>
        )}
      </div>
    </AuthLayout>
  )
}
