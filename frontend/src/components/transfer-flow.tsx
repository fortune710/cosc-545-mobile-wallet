import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowLeft, CheckCircle2, Flag, Mail, ShieldAlert, UserRound, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { AmountDisplay } from './amount-display'

import { config } from '@/lib/app-config'
import type { TransferRecipient, TransferStep } from '@/lib/types'
import { useRecipients, useRecipientSearch } from '@/hooks/use-recipients'
import { transactionService } from '@/services/transaction-service'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { useBalanceQuery } from '@/hooks/use-balance'

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

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

function toTransferRecipient(recipient: { id: string; displayName: string; email: string }): TransferRecipient {
  return {
    id: recipient.id,
    name: recipient.displayName,
    email: recipient.email,
  }
}

export function TransferFlow({ mode }: { mode: 'send' | 'receive' }) {
  const MAX_AMOUNT = config.maxPaymentAmount
  const queryClient = useQueryClient()
  const { recipients, isLoading: recipientsLoading } = useRecipients()
  const { data: balanceData } = useBalanceQuery(mode === 'send')

  const [step, setStep] = useState<TransferStep>(1)
  const [emailInput, setEmailInput] = useState('')
  const [selectedRecipient, setSelectedRecipient] = useState<TransferRecipient | null>(null)
  const [amount, setAmount] = useState(10)
  const [memo, setMemo] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const actionLabel = mode === 'send' ? 'Send' : 'Request'
  const actionPast = mode === 'send' ? 'sent' : 'requested'
  const title = mode === 'send' ? 'Send money' : 'Request money'
  const normalizedQuery = emailInput.trim().toLowerCase()
  const availableBalance = (balanceData?.balance ?? 0) / 100
  const exceedsAvailableBalance = mode === 'send' && amount > availableBalance
  const shortfall = Math.max(amount - availableBalance, 0)

  const filteredRecipients = useMemo(() => {
    if (!normalizedQuery) return recipients
    return recipients.filter(
      (recipient) =>
        recipient.email.toLowerCase().includes(normalizedQuery) ||
        recipient.displayName.toLowerCase().includes(normalizedQuery),
    )
  }, [normalizedQuery, recipients])

  const { results: searchResults, isLoading: isSearchingAccounts } = useRecipientSearch(normalizedQuery)
  const exactAccountMatch = searchResults.find((recipient) => recipient.email.toLowerCase() === normalizedQuery)
  const savedRecipientIds = new Set(recipients.map((recipient) => recipient.id))
  const unsavedSearchResults = searchResults.filter((recipient) => !savedRecipientIds.has(recipient.id))

  const showNotFound =
    normalizedQuery.includes('@') &&
    normalizedQuery.length >= 3 &&
    !isSearchingAccounts &&
    !exactAccountMatch

  function selectRecipient(recipient: TransferRecipient) {
    setSelectedRecipient(recipient)
    setEmailInput(recipient.email)
  }

  function goToAmountStep(recipient: TransferRecipient) {
    selectRecipient(recipient)
    setStep(2)
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
          recipient: selectedRecipient.id,
          amount: amountStr,
          memo: memo.trim() || undefined,
          idempotencyKey,
        })
        await transactionService.confirmPaymentIntent(intent.id)
      } else {
        await transactionService.createPaymentRequest({
          target_user: selectedRecipient.id,
          amount: amountStr,
          memo: memo.trim() || undefined,
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
      setMemo('')
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
    <main className="mx-auto flex min-h-svh w-full max-w-230 flex-col box-border bg-white px-4 pt-8 pb-7 dark:bg-zinc-950 sm:px-5 md:px-8 md:pt-10">
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
                  onChange={(e) => {
                    setEmailInput(e.target.value)
                    setSelectedRecipient(null)
                  }}
                  className="h-12 rounded-xl border-zinc-200 bg-zinc-50 pl-10 dark:border-zinc-700 dark:bg-zinc-900"
                />
              </div>
            </label>

            {selectedRecipient && (
              <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 dark:border-violet-900/50 dark:bg-violet-950/30">
                <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-violet-500">
                  Selected account
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-violet-100 text-[13px] font-bold text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
                    {getInitials(selectedRecipient.name)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-semibold text-violet-950 dark:text-violet-100">
                      {selectedRecipient.name}
                    </span>
                    <span className="block truncate text-[13px] text-violet-700 dark:text-violet-300">
                      {selectedRecipient.email}
                    </span>
                  </span>
                </div>
              </div>
            )}

            {normalizedQuery.length >= 2 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-[14px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Matching accounts
                  </h2>
                  {isSearchingAccounts && <p className="text-[13px] text-zinc-400">Searching…</p>}
                </div>

                {exactAccountMatch && (
                  <button
                    type="button"
                    onClick={() => selectRecipient(toTransferRecipient(exactAccountMatch))}
                    className="flex w-full items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left transition hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/30"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-emerald-100 text-[13px] font-bold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                      {getInitials(exactAccountMatch.displayName)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold text-emerald-900 dark:text-emerald-100">
                        {exactAccountMatch.displayName}
                      </span>
                      <span className="block truncate text-[13px] text-emerald-700 dark:text-emerald-400">
                        {exactAccountMatch.email}
                      </span>
                    </span>
                    <span className="text-[12px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                      Select
                    </span>
                  </button>
                )}

                {!exactAccountMatch &&
                  unsavedSearchResults.map((recipient) => (
                    <button
                      key={recipient.id}
                      type="button"
                      onClick={() => selectRecipient(toTransferRecipient(recipient))}
                      className="flex w-full items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-left transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-zinc-200 text-[13px] font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                        {getInitials(recipient.displayName)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-medium text-zinc-900 dark:text-white">
                          {recipient.displayName}
                        </span>
                        <span className="block truncate text-[13px] text-zinc-500 dark:text-zinc-400">
                          {recipient.email}
                        </span>
                      </span>
                      <span className="text-[12px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Select
                      </span>
                    </button>
                  ))}

                {showNotFound && (
                  <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
                    No account found with this email address.
                  </p>
                )}
              </div>
            )}

            <div>
              <h2 className="mb-3 text-[14px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
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
                      onClick={() => goToAmountStep(toTransferRecipient(recipient))}
                      className="flex w-full items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-3 text-left transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-violet-100 text-[13px] font-bold text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
                        {getInitials(recipient.displayName)}
                      </span>
                      <span className="min-w-0 flex-1">
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

        {step === 2 && (
          <>
            <AmountDisplay
              amount={amount}
              onAmountChange={(v) => setAmount(Math.min(v, MAX_AMOUNT))}
              quickAmounts={quickAmounts}
            />
            {mode === 'send' && (
              <div
                className={[
                  "mt-6 overflow-hidden rounded-[28px] border p-4 shadow-[0_18px_55px_rgba(15,23,42,0.07)] transition-all",
                  exceedsAvailableBalance
                    ? "border-amber-300 bg-[linear-gradient(135deg,rgba(255,248,235,1)_0%,rgba(255,237,213,0.96)_100%)]"
                    : "border-zinc-200 bg-[linear-gradient(135deg,rgba(255,255,255,1)_0%,rgba(244,244,245,0.92)_100%)]",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span
                      className={[
                        "mt-0.5 grid size-11 shrink-0 place-items-center rounded-2xl",
                        exceedsAvailableBalance ? "bg-amber-100 text-amber-700" : "bg-zinc-950 text-white",
                      ].join(" ")}
                    >
                      {exceedsAvailableBalance ? <ShieldAlert className="size-5" /> : <Wallet className="size-5" />}
                    </span>
                    <div>
                      <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                        Available to send
                      </p>
                      <p className="mt-1 text-[28px] font-semibold tracking-[-0.04em] text-zinc-950">
                        {formatCurrency(availableBalance)}
                      </p>
                      <p className="mt-1 text-[13px] text-zinc-500">
                        {exceedsAvailableBalance
                          ? `Short by ${formatCurrency(shortfall)}. Add funds or lower the amount before continuing.`
                          : "You can review and confirm this transfer once the amount is within your balance."}
                      </p>
                    </div>
                  </div>
                  {exceedsAvailableBalance && (
                    <span className="rounded-full border border-amber-300 bg-white/80 px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-amber-700">
                      Blocked
                    </span>
                  )}
                </div>
              </div>
            )}
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

            <div className="mt-4">
              <label className="block space-y-2">
                <span className="flex items-center gap-1.5 text-[14px] font-medium text-zinc-600 dark:text-zinc-400">
                  <Flag className="size-3.5" />
                  Reason / note <span className="text-zinc-400">(optional)</span>
                </span>
                <Input
                  type="text"
                  placeholder="e.g. Rent, dinner, invoice #42…"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  maxLength={200}
                  className="h-11 rounded-xl border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900"
                />
              </label>
            </div>
          </>
        )}

        {step === 3 && selectedRecipient && (
          <div
            className={[
              "mt-8 space-y-6 overflow-hidden rounded-[34px] border p-6 shadow-[0_30px_80px_rgba(15,23,42,0.08)]",
              exceedsAvailableBalance
                ? "border-amber-300 bg-[radial-gradient(circle_at_top,rgba(255,251,235,1),rgba(255,237,213,0.96)_55%,rgba(255,255,255,0.98)_100%)]"
                : "border-zinc-100 bg-[radial-gradient(circle_at_top,rgba(245,243,255,0.9),rgba(255,255,255,1)_60%)] dark:border-zinc-800 dark:bg-zinc-900",
            ].join(" ")}
          >
            <div
              className={[
                "mx-auto grid size-14 place-items-center rounded-full",
                exceedsAvailableBalance
                  ? "bg-amber-100 text-amber-700"
                  : "bg-violet-100 text-violet-600 dark:bg-violet-900/50 dark:text-violet-300",
              ].join(" ")}
            >
              {exceedsAvailableBalance ? <AlertTriangle className="size-7" /> : <CheckCircle2 className="size-7" />}
            </div>
            <div className="text-center">
              <p className="text-[12px] uppercase tracking-[0.08em] text-zinc-400">
                {exceedsAvailableBalance ? 'Transfer blocked' : `Confirm ${actionLabel.toLowerCase()}`}
              </p>
              <p className="mt-2 text-[52px] font-bold tracking-[-0.05em] text-zinc-950 dark:text-white">
                {formatAmount(amount, true)}
              </p>
              <p className="mt-1 text-[15px] text-zinc-500">
                {mode === 'send' ? 'to' : 'from'}{' '}
                <span className="font-semibold text-zinc-700 dark:text-zinc-300">{selectedRecipient.name}</span>{' '}
                ({selectedRecipient.email})
              </p>
              {memo.trim() && (
                <div className="mx-auto mt-4 flex max-w-xs items-start gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-left dark:border-zinc-700 dark:bg-zinc-800">
                  <Flag className="mt-0.5 size-3.5 shrink-0 text-zinc-400" />
                  <p className="text-[13px] text-zinc-600 dark:text-zinc-300">{memo.trim()}</p>
                </div>
              )}
            </div>
            {exceedsAvailableBalance && (
              <div className="rounded-[24px] border border-amber-300/80 bg-white/80 px-4 py-4 text-left shadow-sm backdrop-blur">
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-700">
                    <ShieldAlert className="size-5" />
                  </span>
                  <div>
                    <p className="text-[15px] font-semibold text-amber-950">Insufficient funds</p>
                    <p className="mt-1 text-[13px] leading-5 text-amber-900/80">
                      This send amount is above your current balance. Available balance: {formatCurrency(availableBalance)}.
                      Shortfall: {formatCurrency(shortfall)}.
                    </p>
                  </div>
                </div>
              </div>
            )}
            {submitError && <p className="text-center text-sm text-red-500">{submitError}</p>}
          </div>
        )}
      </section>

      <div className="mx-auto mt-auto w-full max-w-175 pt-8">
        {step === 1 && (
          <Button
            disabled={!selectedRecipient}
            onClick={() => selectedRecipient && goToAmountStep(selectedRecipient)}
            className="h-14 w-full rounded-full bg-violet-600 text-[17px] font-semibold text-white hover:bg-violet-700"
          >
            Continue
          </Button>
        )}

        {step === 2 && (
          <div className="space-y-2">
            <Button
              onClick={() => setStep(3)}
              disabled={amount <= 0 || exceedsAvailableBalance}
              className="h-14 w-full rounded-full bg-violet-600 text-[17px] font-semibold text-white hover:bg-violet-700"
            >
              {exceedsAvailableBalance ? "Amount exceeds balance" : "Continue"}
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
              disabled={isSubmitting || exceedsAvailableBalance}
              className="h-14 w-full rounded-full bg-violet-600 text-[17px] font-semibold text-white hover:bg-violet-700"
            >
              {exceedsAvailableBalance
                ? "Add funds or lower amount"
                : isSubmitting
                  ? `${actionLabel}ing...`
                  : `${actionLabel} now`}
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
