import { useMemo, useState } from 'react'
import { ArrowLeft, CheckCircle2, Mail, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { AmountDisplay } from './amount-display'

import { config } from '@/lib/app-config'
import type { TransferRecipient, TransferStep } from '@/lib/types'
import { useRecipients } from '@/hooks/use-recipients'
import { transactionService } from '@/services/transaction-service'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'

const quickAmounts = [5, 10, 20, 50]

function formatAmount(value: number, withCents = false) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: withCents ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(value)
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

export function TransferFlow({ mode }: { mode: 'send' | 'receive' }) {
  const MAX_AMOUNT = config.maxPaymentAmount
  const queryClient = useQueryClient()
  const { recipients, isLoading: recipientsLoading } = useRecipients()

  const [step, setStep] = useState<TransferStep>(1)
  const [emailInput, setEmailInput] = useState('')
  const [selectedRecipient, setSelectedRecipient] = useState<TransferRecipient | null>(null)
  const [amount, setAmount] = useState(10)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const actionLabel = mode === 'send' ? 'Send' : 'Request'
  const actionPast = mode === 'send' ? 'sent' : 'requested'
  const title = mode === 'send' ? 'Send money' : 'Request money'

  const filteredRecipients = useMemo(() => {
    const query = emailInput.trim().toLowerCase()
    if (!query) return recipients
    return recipients.filter(
      (r) =>
        r.email.toLowerCase().includes(query) ||
        r.displayName.toLowerCase().includes(query),
    )
  }, [emailInput, recipients])

  const isNewEmail =
    emailInput.trim().includes('@') &&
    !recipients.some((r) => r.email.toLowerCase() === emailInput.trim().toLowerCase())

  function goToAmountStep(recipient: TransferRecipient) {
    setSelectedRecipient(recipient)
    setEmailInput(recipient.email)
    setStep(2)
  }

  function useNewEmailRecipient() {
    const email = emailInput.trim()
    if (!email.includes('@')) return
    goToAmountStep({ id: 'new', name: email.split('@')[0], email })
  }

  async function completeAction() {
    if (!selectedRecipient || amount <= 0) return

    setIsSubmitting(true)
    setSubmitError('')

    try {
      const amountStr = amount.toFixed(2)

      if (mode === 'send') {
        const idempotencyKey = generateUUID()
        const intent = await transactionService.createPaymentIntent({
          recipient: selectedRecipient.email,
          amount: amountStr,
          idempotencyKey,
        })
        await transactionService.confirmPaymentIntent(intent.id)
      } else {
        await transactionService.createPaymentRequest({
          target_user: selectedRecipient.email,
          amount: amountStr,
        })
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.balance })
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions() })

      toast.success(
        `${formatAmount(amount, true)} ${actionPast} ${mode === 'send' ? 'to' : 'from'} ${selectedRecipient.name}`,
      )

      setStep(1)
      setSelectedRecipient(null)
      setEmailInput('')
      setAmount(10)
    } catch (error: any) {
      const msg =
        error?.response?.data?.detail ||
        error?.response?.data?.non_field_errors?.[0] ||
        `Failed to ${actionLabel.toLowerCase()}. Please try again.`
      setSubmitError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-230 flex-col box-border bg-white dark:bg-zinc-950 px-4 pt-8 pb-7 sm:px-5 md:px-8 md:pt-10">
      <header className="grid grid-cols-[44px_1fr_44px] items-center">
        <Link
          to="/home"
          className="grid size-11 place-items-center rounded-full text-zinc-900 hover:bg-zinc-100 dark:text-white dark:hover:bg-zinc-800"
          aria-label="Back to home"
        >
          <ArrowLeft className="size-6" />
        </Link>
        <h1 className="text-center text-[36px] font-bold tracking-[-0.03em] text-zinc-950 dark:text-white md:text-[44px]">
          {title}
        </h1>
        <span />
      </header>

      <section className="mx-auto mt-8 w-full max-w-175">
        {/* Step 1: Recipient */}
        {step === 1 && (
          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-[14px] font-medium text-zinc-600 dark:text-zinc-400">
                {mode === 'send' ? 'Send to' : 'Request from'}
              </span>
              <div className="relative">
                <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  type="email"
                  placeholder="name@example.com or search"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="h-12 rounded-xl border-zinc-200 bg-zinc-50 pl-10 dark:border-zinc-700 dark:bg-zinc-900"
                />
              </div>
            </label>

            {isNewEmail && (
              <button
                type="button"
                onClick={useNewEmailRecipient}
                className="w-full rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-left text-[14px] font-medium text-violet-800 transition hover:bg-violet-100 dark:border-violet-900/50 dark:bg-violet-950/30 dark:text-violet-300"
              >
                Use <strong>{emailInput.trim()}</strong> as recipient
              </button>
            )}

            <div>
              <h2 className="mb-3 text-[14px] font-semibold text-zinc-500 uppercase tracking-wide dark:text-zinc-400">
                Saved recipients
              </h2>
              {recipientsLoading ? (
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-3 rounded-xl border border-zinc-100 p-3">
                      <Skeleton className="size-9 rounded-full" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-28 rounded" />
                        <Skeleton className="h-3 w-40 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredRecipients.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-zinc-400">
                  <UserRound className="mb-2 size-8 opacity-40" />
                  <p className="text-[14px]">No saved recipients yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredRecipients.map((recipient) => (
                    <button
                      key={recipient.id}
                      type="button"
                      onClick={() => goToAmountStep({ id: recipient.id, name: recipient.displayName, email: recipient.email })}
                      className="flex w-full items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-3 text-left transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-violet-100 text-[13px] font-bold text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
                        {getInitials(recipient.displayName)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[15px] font-medium text-zinc-900 dark:text-white">
                          {recipient.displayName}
                        </span>
                        <span className="block truncate text-[13px] text-zinc-500 dark:text-zinc-400">
                          {recipient.email}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Amount */}
        {step === 2 && (
          <>
            <AmountDisplay
              amount={amount}
              onAmountChange={(v) => setAmount(Math.min(v, MAX_AMOUNT))}
              quickAmounts={quickAmounts}
            />
            {selectedRecipient && (
              <div className="mt-6 rounded-2xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-[12px] uppercase tracking-[0.08em] text-zinc-400">Recipient</p>
                <div className="mt-1 flex items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-violet-100 text-[13px] font-bold text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
                    {getInitials(selectedRecipient.name)}
                  </span>
                  <div>
                    <p className="text-[16px] font-semibold text-zinc-950 dark:text-white">{selectedRecipient.name}</p>
                    <p className="text-[13px] text-zinc-500">{selectedRecipient.email}</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && selectedRecipient && (
          <div className="mt-8 space-y-6 rounded-3xl border border-zinc-100 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-900/50 dark:text-violet-300">
              <CheckCircle2 className="size-7" />
            </div>
            <div className="text-center">
              <p className="text-[12px] uppercase tracking-[0.08em] text-zinc-400">
                Confirm {actionLabel.toLowerCase()}
              </p>
              <p className="mt-2 text-[52px] font-bold tracking-[-0.05em] text-zinc-950 dark:text-white">
                {formatAmount(amount, true)}
              </p>
              <p className="mt-1 text-[15px] text-zinc-500">
                {mode === 'send' ? 'to' : 'from'}{' '}
                <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                  {selectedRecipient.name}
                </span>{' '}
                ({selectedRecipient.email})
              </p>
            </div>
            {submitError && (
              <p className="text-center text-sm text-red-500">{submitError}</p>
            )}
          </div>
        )}
      </section>

      <div className="mx-auto mt-auto w-full max-w-175 pt-8">
        {step === 1 && (
          <Button
            disabled={!selectedRecipient}
            onClick={() => setStep(2)}
            className="h-14 w-full rounded-full bg-violet-600 text-[17px] font-semibold text-white hover:bg-violet-700"
          >
            Continue
          </Button>
        )}

        {step === 2 && (
          <div className="space-y-2">
            <Button
              onClick={() => setStep(3)}
              disabled={amount <= 0}
              className="h-14 w-full rounded-full bg-violet-600 text-[17px] font-semibold text-white hover:bg-violet-700"
            >
              Continue
            </Button>
            <Button variant="outline" onClick={() => setStep(1)} className="h-12 w-full rounded-full">
              Back
            </Button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-2">
            <Button
              onClick={completeAction}
              disabled={isSubmitting}
              className="h-14 w-full rounded-full bg-violet-600 text-[17px] font-semibold text-white hover:bg-violet-700"
            >
              {isSubmitting ? `${actionLabel}ing...` : `${actionLabel} now`}
            </Button>
            <Button variant="outline" onClick={() => setStep(2)} className="h-12 w-full rounded-full" disabled={isSubmitting}>
              Back
            </Button>
          </div>
        )}
      </div>
    </main>
  )
}
