import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CreditCard, ShieldAlert } from 'lucide-react'

import { AmountDisplay } from '@/components/amount-display'
import { Button } from '@/components/ui/button'
import { SettingsLayout } from '@/components/layout/settings-layout'
import { transactionService } from '@/services/transaction-service'
import { queryKeys } from '@/lib/query-keys'
import { useCurrentUser } from '@/hooks/use-current-user'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UnauthorizedError } from '@/lib/errors/auth'

const MIN_AMOUNT = 1
const MAX_AMOUNT = 500
const quickAmounts = [10, 25, 50, 100]
const DEMO_CARD = {
  cardholder_name: 'AuraPay Demo',
  card_number: '4242 4242 4242 4242',
  expiry_month: '12',
  expiry_year: '34',
  cvv: '123',
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, '')
}

function isCardExpired(month: string, year: string): boolean {
  const m = parseInt(digitsOnly(month), 10)
  const y = parseInt(digitsOnly(year), 10)
  if (isNaN(m) || isNaN(y) || m < 1 || m > 12) return false
  const now = new Date()
  const fullYear = 2000 + y
  // Expired if before the first day of the card's month
  return fullYear < now.getFullYear() || (fullYear === now.getFullYear() && m < now.getMonth() + 1)
}

function formatCardNumber(value: string) {
  return digitsOnly(value)
    .slice(0, 16)
    .replace(/(.{4})/g, '$1 ')
    .trim()
}

export function AddBalancePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, loading: isUserLoading } = useCurrentUser()
  const [amount, setAmount] = useState(25)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isCardModalOpen, setIsCardModalOpen] = useState(false)
  const [cardholderName, setCardholderName] = useState(DEMO_CARD.cardholder_name)
  const [cardNumber, setCardNumber] = useState(DEMO_CARD.card_number)
  const [expiryMonth, setExpiryMonth] = useState(DEMO_CARD.expiry_month)
  const [expiryYear, setExpiryYear] = useState(DEMO_CARD.expiry_year)
  const [cvv, setCvv] = useState(DEMO_CARD.cvv)

  const clampedAmount = Math.min(Math.max(amount, 0), MAX_AMOUNT)
  const isValid = clampedAmount >= MIN_AMOUNT
  const isMfaReady = Boolean(user?.mfaEnabled)

  const ctaLabel = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(clampedAmount)

  const isExpiryComplete =
    digitsOnly(expiryMonth).length === 2 && digitsOnly(expiryYear).length === 2
  const isExpired = isExpiryComplete && isCardExpired(expiryMonth, expiryYear)

  const canSubmitCard = useMemo(
    () =>
      Boolean(
        cardholderName.trim() &&
        digitsOnly(cardNumber).length === 16 &&
        isExpiryComplete &&
        !isExpired &&
        digitsOnly(cvv).length === 3,
      ),
    [cardholderName, cardNumber, cvv, isExpiryComplete, isExpired],
  )

  const resetErrors = () => setErrorMessage('')

  const handleOpenCardModal = () => {
    if (!isValid || isSubmitting) return
    if (!isUserLoading && !isMfaReady) {
      setErrorMessage('Funding is locked until MFA is active. Finish authenticator setup, then try again.')
      return
    }
    resetErrors()
    setIsCardModalOpen(true)
  }

  const handleFund = async () => {
    if (!isValid || isSubmitting || !canSubmitCard) return

    setIsSubmitting(true)
    setErrorMessage('')

    const normalizedCardNumber = formatCardNumber(cardNumber)
    const normalizedExpiryMonth = digitsOnly(expiryMonth).slice(0, 2)
    const normalizedExpiryYear = digitsOnly(expiryYear).slice(0, 2)
    const normalizedCvv = digitsOnly(cvv).slice(0, 3)

    if (
      cardholderName.trim() !== DEMO_CARD.cardholder_name ||
      normalizedCardNumber !== DEMO_CARD.card_number ||
      normalizedExpiryMonth !== DEMO_CARD.expiry_month ||
      normalizedExpiryYear !== DEMO_CARD.expiry_year ||
      normalizedCvv !== DEMO_CARD.cvv
    ) {
      setErrorMessage('Use the exact demo card shown above. This flow only accepts the provided test card.')
      setIsSubmitting(false)
      return
    }

    try {
      await transactionService.fundWallet({
        amount: clampedAmount.toFixed(2),
        cardholder_name: cardholderName.trim(),
        card_number: digitsOnly(cardNumber),
        expiry_month: normalizedExpiryMonth,
        expiry_year: normalizedExpiryYear,
        cvv: normalizedCvv,
      })
      await queryClient.invalidateQueries({ queryKey: queryKeys.balance })
      await queryClient.invalidateQueries({ queryKey: ['transactions'] })
      await queryClient.invalidateQueries({ queryKey: queryKeys.notifications() })
      toast.success(`${ctaLabel} added to your wallet!`)
      setIsCardModalOpen(false)
      navigate('/home', { replace: true })
    } catch (error: any) {
      if (error instanceof UnauthorizedError) {
        setErrorMessage('Funding requires an active MFA session. Re-enroll or verify your authenticator, then try again.')
        setIsSubmitting(false)
        return
      }
      const data = error?.response?.data
      const msg =
        data?.detail ||
        data?.non_field_errors?.[0] ||
        data?.amount?.[0] ||
        data?.card_number?.[0] ||
        'Failed to add funds. Please try again.'
      setErrorMessage(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <SettingsLayout title="Add money" backTo="/home" backLabel="">
      <AmountDisplay
        amount={clampedAmount}
        onAmountChange={(value) => {
          setAmount(value)
          resetErrors()
        }}
        quickAmounts={quickAmounts}
        maxAmount={MAX_AMOUNT}
      />

      <div className="mt-6 rounded-2xl border border-zinc-100 bg-zinc-50 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-[13px] text-zinc-500 dark:text-zinc-400">
          Demo funding only. Use the provided test card in the next step to add funds instantly. Minimum ${MIN_AMOUNT}, maximum ${MAX_AMOUNT} per transaction.
        </p>
      </div>

      {!isUserLoading && !isMfaReady && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-amber-950">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-700" />
            <div>
              <p className="text-sm font-semibold">Funding is currently blocked</p>
              <p className="mt-1 text-sm leading-6 text-amber-900/80">
                Your account needs active MFA before wallet funding can succeed. Complete authenticator setup in security settings first.
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-3 rounded-xl border-amber-300 bg-transparent text-amber-900 hover:bg-amber-100"
                onClick={() => navigate('/mfa')}
              >
                Open MFA settings
              </Button>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <p>{errorMessage}</p>
          </div>
        </div>
      )}

      <div className="mt-auto pt-8">
        <Button
          onClick={handleOpenCardModal}
          disabled={!isValid || isSubmitting || (!isUserLoading && !isMfaReady)}
          className="h-14 w-full rounded-full bg-violet-600 text-[17px] font-semibold text-white hover:bg-violet-700 disabled:bg-zinc-200 disabled:text-zinc-400 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-600"
        >
          {`Add ${ctaLabel} to wallet`}
        </Button>
      </div>

      <Dialog open={isCardModalOpen} onOpenChange={setIsCardModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="text-xl font-semibold tracking-tight text-zinc-950">
              Add demo funds
            </DialogTitle>
            <DialogDescription className="text-sm leading-6 text-zinc-500">
              This is a demo card form. Only the test card below will succeed and credit your wallet.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 pb-2">
            <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-4 text-sm text-violet-950">
              <div className="flex items-center gap-2">
                <CreditCard className="size-4 text-violet-700" />
                <p className="font-semibold">Accepted demo card</p>
              </div>
              <div className="mt-3 grid gap-2">
                <div className="flex items-center justify-between gap-4 rounded-xl bg-white/70 px-3 py-2">
                  <span className="text-violet-700">Number</span>
                  <span className="font-semibold tracking-wide">{DEMO_CARD.card_number}</span>
                </div>
                <div className="flex items-center justify-between gap-4 rounded-xl bg-white/70 px-3 py-2">
                  <span className="text-violet-700">Name</span>
                  <span className="font-semibold">{DEMO_CARD.cardholder_name}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-white/70 px-3 py-2">
                    <span className="block text-violet-700">Expiry</span>
                    <span className="font-semibold">{DEMO_CARD.expiry_month}/{DEMO_CARD.expiry_year}</span>
                  </div>
                  <div className="rounded-xl bg-white/70 px-3 py-2">
                    <span className="block text-violet-700">CVV</span>
                    <span className="font-semibold">{DEMO_CARD.cvv}</span>
                  </div>
                </div>
              </div>
              <p className="mt-3 text-[13px] leading-5 text-violet-800">
                Any other card details will be declined by the demo backend.
              </p>
            </div>
          </div>

          <div className="grid gap-4 px-6 pb-6">
            <div className="grid gap-1.5">
              <Label htmlFor="cardholder_name">Cardholder name</Label>
              <Input
                id="cardholder_name"
                value={cardholderName}
                onChange={(event) => {
                  setCardholderName(event.target.value)
                  resetErrors()
                }}
                placeholder="AuraPay Demo"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="card_number">Card number</Label>
              <Input
                id="card_number"
                inputMode="numeric"
                value={cardNumber}
                onChange={(event) => {
                  setCardNumber(formatCardNumber(event.target.value))
                  resetErrors()
                }}
                placeholder="4242 4242 4242 4242"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="expiry_month">Month</Label>
                <Input
                  id="expiry_month"
                  inputMode="numeric"
                  value={expiryMonth}
                  onChange={(event) => {
                    setExpiryMonth(digitsOnly(event.target.value).slice(0, 2))
                    resetErrors()
                  }}
                  placeholder="12"
                  className={isExpired ? 'border-red-400 focus-visible:ring-red-400' : ''}
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="expiry_year">Year</Label>
                <Input
                  id="expiry_year"
                  inputMode="numeric"
                  value={expiryYear}
                  onChange={(event) => {
                    setExpiryYear(digitsOnly(event.target.value).slice(0, 2))
                    resetErrors()
                  }}
                  placeholder="34"
                  className={isExpired ? 'border-red-400 focus-visible:ring-red-400' : ''}
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="cvv">CVV</Label>
                <Input
                  id="cvv"
                  inputMode="numeric"
                  value={cvv}
                  onChange={(event) => {
                    setCvv(digitsOnly(event.target.value).slice(0, 3))
                    resetErrors()
                  }}
                  placeholder="123"
                />
              </div>
            </div>

            {isExpired && (
              <p className="text-sm text-red-500">This card has expired. Please enter a valid expiry date.</p>
            )}

            {errorMessage && (
              <p className="text-sm text-red-500">{errorMessage}</p>
            )}
          </div>

          <DialogFooter className="rounded-b-3xl px-6 py-4">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => {
                setIsCardModalOpen(false)
                resetErrors()
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-xl bg-violet-600 text-white hover:bg-violet-700"
              disabled={isSubmitting || !canSubmitCard}
              onClick={handleFund}
            >
              {isSubmitting ? 'Funding...' : `Fund ${ctaLabel}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsLayout>
  )
}
