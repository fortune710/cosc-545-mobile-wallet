import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeft, QrCode, ShieldCheck } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'sonner'
import { REGEXP_ONLY_DIGITS } from 'input-otp'

import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Button } from '@/components/ui/button'
import { AuthLayout } from '@/components/auth/auth-layout'
import { useMfa } from '@/hooks/use-mfa'
import { Spinner } from '@/components/ui/spinner'

export function MfaPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { enroll, verify, provisioningUrl, enrollError, isVerifying } = useMfa()

  const token = searchParams.get('token')
  const enrolledParam = searchParams.get('enrolled')
  const [step, setStep] = useState<'scan' | 'verify'>(enrolledParam === 'true' ? 'verify' : 'scan')
  const [mfaCode, setMfaCode] = useState('')
  const [verifyError, setVerifyError] = useState('')

  useEffect(() => {
    if (enrolledParam === 'false' && !token) {
      toast.error('Please enroll MFA first')
      navigate('/signup', { replace: true })
      return
    }
    if (step === 'scan') {
      enroll(token || undefined).catch(() => {})
    }
  }, [enroll, token, step, enrolledParam, navigate])

  const handleBack = () => {
    if (step === 'verify') {
      setStep('scan')
      setMfaCode('')
      setVerifyError('')
    } else {
      navigate(-1)
    }
  }

  const handleVerify = async () => {
    if (mfaCode.length !== 6) return
    try {
      await verify({ code: mfaCode, token: token || undefined })
      toast.success('MFA enabled successfully')
      navigate('/home', { replace: true })
    } catch {
      setVerifyError('Invalid verification code. Please try again.')
      setMfaCode('')
    }
  }

  return (
    <AuthLayout>
      <div className="flex flex-1 flex-col px-6 py-10 sm:px-10 md:px-12 lg:px-16 xl:px-20">
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-1.5 text-[13px] font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition-colors"
        >
          <ChevronLeft className="size-4" />
          Back
        </button>

        <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
          {step === 'scan' ? (
            <>
              <div className="grid size-16 place-items-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400">
                <QrCode className="size-8" strokeWidth={1.5} />
              </div>
              <h1 className="mt-5 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
                Set up authenticator
              </h1>
              <p className="mt-2 max-w-xs text-[14px] text-zinc-500 dark:text-zinc-400">
                Scan this QR code with Google Authenticator, Authy, or any TOTP app.
              </p>

              <div className="mt-8 inline-block rounded-2xl border border-zinc-100 bg-white p-5 shadow-md dark:border-zinc-800 dark:bg-zinc-900">
                {provisioningUrl ? (
                  <QRCodeSVG value={provisioningUrl} size={160} />
                ) : (
                  <div className="size-40 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
                )}
              </div>

              {enrollError && (
                <p className="mt-4 text-[13px] text-red-500">
                  {(enrollError as any).response?.data?.detail || 'Failed to initialize MFA'}
                </p>
              )}

              <Button
                onClick={() => setStep('verify')}
                disabled={!provisioningUrl}
                className="mt-8 h-11 w-full max-w-xs rounded-xl bg-violet-600 text-[15px] font-semibold text-white hover:bg-violet-700"
              >
                I&apos;ve scanned it
              </Button>
            </>
          ) : (
            <>
              <div className="grid size-16 place-items-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400">
                <ShieldCheck className="size-8" strokeWidth={1.5} />
              </div>
              <h1 className="mt-5 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
                Enter verification code
              </h1>
              <p className="mt-2 max-w-xs text-[14px] text-zinc-500 dark:text-zinc-400">
                Enter the 6-digit code from your authenticator app
              </p>

              <div className="mt-8 flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={mfaCode}
                  onChange={(val) => { setMfaCode(val); setVerifyError('') }}
                  pattern={REGEXP_ONLY_DIGITS}
                  autoFocus
                  onComplete={handleVerify}
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

              {verifyError && (
                <p className="mt-4 text-[13px] font-medium text-red-500">{verifyError}</p>
              )}

              <Button
                onClick={handleVerify}
                disabled={mfaCode.length !== 6 || isVerifying}
                className="mt-7 h-11 w-full max-w-xs rounded-xl bg-violet-600 text-[15px] font-semibold text-white hover:bg-violet-700"
              >
                {isVerifying ? <Spinner /> : 'Verify & Enable MFA'}
              </Button>
            </>
          )}
        </div>
      </div>
    </AuthLayout>
  )
}
