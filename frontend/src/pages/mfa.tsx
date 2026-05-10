import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ShieldCheck, QrCode } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'sonner'

import { PinEntrySlide } from '@/components/pin-entry-slide'
import { Button } from '@/components/ui/button'
import { useMfa } from '@/hooks/use-mfa'
import { Spinner } from '@/components/ui/spinner'

export function MfaPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const {
    enroll,
    verify,
    provisioningUrl,
    enrollError,
    isVerifying,
    //isEnrolling 
  } = useMfa()

  const token = searchParams.get('token')
  const enrolledParam = searchParams.get('enrolled')
  const [step, setStep] = useState<'scan' | 'verify'>(enrolledParam === 'true' ? 'verify' : 'scan')
  const [mfaCode, setMfaCode] = useState('')
  const [verifyError, setVerifyError] = useState('')

  useEffect(() => {
    // If not enrolled and no identification token present, redirect to signup
    if (enrolledParam === 'false' && !token) {
      toast.error('Please enroll MFA first')
      navigate('/signup', { replace: true })
      return
    }

    if (step === 'scan') {
      enroll(token || undefined).catch(() => {
        // Error handled by hook
      })
    }
  }, [enroll, token, step, enrolledParam, navigate])

  const handleBack = () => {
    if (step === 'verify') {
      setStep('scan')
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
    } catch (err) {
      setVerifyError('Invalid verification code')
      setMfaCode('')
    }
  }

  return (
    <main className="min-h-svh bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] text-slate-950">
      <div className="mx-auto flex min-h-svh w-full max-w-md flex-col px-2 pb-8 pt-6">
        <header className="flex items-center">
          <Button
            type="button"
            size="icon-lg"
            variant="ghost"
            onClick={handleBack}
            className="size-14 rounded-full border border-white/70 bg-white/90 text-slate-950 shadow-[0_18px_36px_rgba(15,23,42,0.08)] backdrop-blur"
          >
            <ChevronLeft className="size-8" strokeWidth={1.8} />
          </Button>
        </header>

        <div className="flex flex-1 flex-col justify-center py-2">
          {step === 'scan' ? (
            <div className="flex flex-col items-center text-center">
              <div className="grid size-24 place-items-center rounded-[28px] bg-[linear-gradient(180deg,#EEF4FF_0%,#E8EEFF_100%)] text-[#2F6AE8] shadow-[0_20px_40px_rgba(47,106,232,0.12)]">
                <QrCode className="size-10" strokeWidth={1.8} />
              </div>
              <h1 className="mt-10 text-[3rem] font-semibold leading-[0.98] tracking-[-0.08em]">
                Setup MFA
              </h1>
              <p className="mt-4 text-slate-500">
                Scan this QR code with your authenticator app
              </p>

              <div className="mt-10 rounded-2xl bg-white p-6 shadow-xl">
                {provisioningUrl ? (
                  <QRCodeSVG value={provisioningUrl} size={200} />
                ) : (
                  <div className="h-[200px] w-[200px] animate-pulse bg-slate-100 rounded-lg" />
                )}
              </div>

              {enrollError && <p className="mt-4 text-sm text-red-500">{(enrollError as any).response?.data?.detail || 'Failed to initialize MFA'}</p>}

              <Button
                onClick={() => setStep('verify')}
                disabled={!provisioningUrl}
                className="mt-10 h-16 w-full rounded-full text-lg font-semibold text-white shadow-[0_18px_40px_rgba(47,106,232,0.28)]"
              >
                I&apos;ve scanned it
              </Button>
            </div>
          ) : (
            <PinEntrySlide
              icon={<ShieldCheck className="size-10" strokeWidth={1.8} />}
              title="Verify Code"
              description="Enter the 6-digit code from your authenticator app"
              value={mfaCode}
              onChange={(val) => {
                setMfaCode(val)
                setVerifyError('')
              }}
              error={verifyError}
              length={6}
              masked={false}
            />
          )}
        </div>

        {step === 'verify' && (
          <footer className="pt-6">
            <Button
              onClick={handleVerify}
              disabled={mfaCode.length !== 6 || isVerifying}
              className="h-16 w-full rounded-full text-lg font-semibold text-white shadow-[0_18px_40px_rgba(47,106,232,0.28)]"
            >
              {isVerifying ? <Spinner /> : 'Verify & Enable'}
            </Button>
          </footer>
        )}
      </div>
    </main>
  )
}
