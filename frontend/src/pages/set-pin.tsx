import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AxiosError } from 'axios'
import { ChevronLeft, LockKeyhole } from 'lucide-react'
import { toast } from 'sonner'
import { REGEXP_ONLY_DIGITS } from 'input-otp'

import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Button } from '@/components/ui/button'
import { AuthLayout } from '@/components/auth/auth-layout'
import { useResetPin } from '@/hooks/use-change-pin'
import { pinSchema } from '@/lib/schemas/auth'
import { config } from '@/lib/app-config'

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof AxiosError) {
    const detail = error.response?.data?.detail
    if (typeof detail === 'string' && detail.length > 0) return detail
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}

function getSafeReturnTo(rawValue: string | null) {
  if (!rawValue || !rawValue.startsWith('/') || rawValue.startsWith('//')) return '/home'
  return rawValue
}

export function SetPinPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const resetPinMutation = useResetPin()
  const returnTo = getSafeReturnTo(searchParams.get('returnTo'))

  const [pin, setPin] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const isButtonDisabled = useMemo(
    () => resetPinMutation.isPending || pin.length !== config.pinLength,
    [pin.length, resetPinMutation.isPending],
  )

  const handleContinue = async () => {
    const validationResult = pinSchema.safeParse(pin)
    if (!validationResult.success) {
      setErrorMessage(validationResult.error.issues[0]?.message ?? 'Invalid PIN.')
      return
    }

    try {
      await resetPinMutation.mutateAsync(pin)
      toast.success('PIN set successfully.')
      navigate(returnTo, { replace: true })
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'We could not set your PIN. Please try again.'))
    }
  }

  return (
    <AuthLayout>
      <div className="flex flex-1 flex-col px-6 py-10 sm:px-10 md:px-12 lg:px-16 xl:px-20">
        <button
          type="button"
          onClick={() => navigate('/login', { replace: true })}
          className="flex items-center gap-1.5 text-[13px] font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition-colors"
          aria-label="Go back"
        >
          <ChevronLeft className="size-4" />
          Back
        </button>

        <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
          <div className="grid size-16 place-items-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400">
            <LockKeyhole className="size-8" strokeWidth={1.5} />
          </div>

          <h1 className="mt-5 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
            Create your PIN
          </h1>
          <p className="mt-2 max-w-xs text-[14px] text-zinc-500 dark:text-zinc-400">
            Choose a {config.pinLength}-digit PIN to quickly access your wallet
          </p>

          <div className="mt-8 flex justify-center">
            <InputOTP
              maxLength={config.pinLength}
              value={pin}
              onChange={(val) => { setPin(val); setErrorMessage('') }}
              pattern={REGEXP_ONLY_DIGITS}
              autoFocus
              onComplete={handleContinue}
            >
              <InputOTPGroup className="gap-3">
                {Array.from({ length: config.pinLength }).map((_, i) => (
                  <InputOTPSlot
                    key={i}
                    index={i}
                    className="size-14 rounded-xl border border-zinc-200 bg-zinc-50 text-xl font-bold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white data-[active=true]:border-violet-500 data-[active=true]:ring-2 data-[active=true]:ring-violet-200 dark:data-[active=true]:border-violet-400"
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>

          {errorMessage && (
            <p className="mt-4 text-[13px] font-medium text-red-500">{errorMessage}</p>
          )}

          <Button
            type="button"
            onClick={handleContinue}
            disabled={isButtonDisabled}
            className="mt-8 h-11 w-full max-w-xs rounded-xl bg-violet-600 text-[15px] font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {resetPinMutation.isPending ? 'Saving…' : 'Continue'}
          </Button>
        </div>
      </div>
    </AuthLayout>
  )
}
