import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'

import { AmountDisplay } from '@/components/amount-display'
import { Button } from '@/components/ui/button'
import { SettingsLayout } from '@/components/layout/settings-layout'
import { transactionService } from '@/services/transaction-service'
import { queryKeys } from '@/lib/query-keys'
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

export function AddBalancePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
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

  const ctaLabel = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(clampedAmount)

  const canSubmitCard = useMemo(
    () =>
      Boolean(
        cardholderName.trim() &&
        cardNumber.trim() &&
        expiryMonth.trim() &&
        expiryYear.trim() &&
        cvv.trim(),
      ),
    [cardholderName, cardNumber, cvv, expiryMonth, expiryYear],
  )

  const resetErrors = () => setErrorMessage('')

  const handleOpenCardModal = () => {
    if (!isValid || isSubmitting) return
    resetErrors()
    setIsCardModalOpen(true)
  }

  const handleFund = async () => {
    if (!isValid || isSubmitting || !canSubmitCard) return

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      await transactionService.fundWallet({
        amount: clampedAmount.toFixed(2),
        cardholder_name: cardholderName.trim(),
        card_number: cardNumber.trim(),
        expiry_month: expiryMonth.trim(),
        expiry_year: expiryYear.trim(),
        cvv: cvv.trim(),
      })
      await queryClient.invalidateQueries({ queryKey: queryKeys.balance })
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions() })
      toast.success(`${ctaLabel} added to your wallet!`)
      setIsCardModalOpen(false)
      navigate('/home', { replace: true })
    } catch (error: any) {
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

      {errorMessage && (
        <p className="mt-4 text-center text-sm text-red-500">{errorMessage}</p>
      )}

      <div className="mt-auto pt-8">
        <Button
          onClick={handleOpenCardModal}
          disabled={!isValid || isSubmitting}
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
            <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-4 text-sm text-violet-900">
              <p className="font-semibold">Test card</p>
              <p className="mt-2">Number: {DEMO_CARD.card_number}</p>
              <p>Name: {DEMO_CARD.cardholder_name}</p>
              <p>Expiry: {DEMO_CARD.expiry_month}/{DEMO_CARD.expiry_year}</p>
              <p>CVV: {DEMO_CARD.cvv}</p>
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
                  setCardNumber(event.target.value)
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
                    setExpiryMonth(event.target.value)
                    resetErrors()
                  }}
                  placeholder="12"
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="expiry_year">Year</Label>
                <Input
                  id="expiry_year"
                  inputMode="numeric"
                  value={expiryYear}
                  onChange={(event) => {
                    setExpiryYear(event.target.value)
                    resetErrors()
                  }}
                  placeholder="34"
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="cvv">CVV</Label>
                <Input
                  id="cvv"
                  inputMode="numeric"
                  value={cvv}
                  onChange={(event) => {
                    setCvv(event.target.value)
                    resetErrors()
                  }}
                  placeholder="123"
                />
              </div>
            </div>

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
