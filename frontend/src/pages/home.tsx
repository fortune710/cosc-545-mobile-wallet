import {
  Bell,
  PlusCircle,
  Send,
  Wallet,
  TrendingDown,
  TrendingUp,
  ArrowRight,
} from 'lucide-react'
import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { TransactionListItem } from '@/components/transaction-list-item'
import { PageShell } from '@/components/layout/page-shell'
import { Skeleton } from '@/components/ui/skeleton'
import { useBalanceQuery } from '@/hooks/use-balance'
import { authService } from '@/services/auth-service'
import { useNotifications } from '@/hooks/use-notifications'
import { useCurrentUser } from '@/hooks/use-current-user'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useTransactionHistory, defaultFilters } from '@/hooks/use-transactions'
import { useRecipients } from '@/hooks/use-recipients'

function ActionButton({ icon, label, to }: { icon: ReactNode; label: string; to: string }) {
  return (
    <Link to={to} className="group flex flex-col items-center gap-2 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-white/20 text-white shadow-sm ring-1 ring-white/30 transition-all group-hover:bg-white/30 group-hover:scale-105 group-active:scale-95 backdrop-blur-sm sm:size-14">
        {icon}
      </span>
      <span className="text-[12px] font-semibold text-white/90 sm:text-[13px]">{label}</span>
    </Link>
  )
}

/* ─── Stat card with colored left border ─── */
function StatCard({
  label,
  value,
  icon,
  borderColor,
  loading,
}: {
  label: string
  value: string
  icon: ReactNode
  borderColor: string
  loading: boolean
}) {
  return (
    <div
      className={`flex-1 min-w-0 rounded-2xl border border-zinc-100 bg-white pl-4 pr-3 py-3.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 border-l-4 ${borderColor}`}
    >
      <div className="flex items-start justify-between gap-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 leading-tight">
          {label}
        </p>
        <span className="shrink-0 mt-0.5">{icon}</span>
      </div>
      <div className="mt-2">
        {loading ? (
          <Skeleton className="h-6 w-14 rounded" />
        ) : (
          <p className="text-[19px] font-bold tracking-[-0.03em] text-zinc-900 dark:text-white leading-none">
            {value}
          </p>
        )}
      </div>
    </div>
  )
}

/* ─── Spending ratio bar ─── */
function SpendingBar({
  totalIn,
  totalOut,
  loading,
}: {
  totalIn: number
  totalOut: number
  loading: boolean
}) {
  const total = totalIn + totalOut
  if (!loading && total === 0) return null

  const inPct = total > 0 ? Math.round((totalIn / total) * 100) : 50
  const outPct = 100 - inPct

  return (
    <div className="rounded-2xl border border-zinc-100 bg-white px-4 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[13px] font-semibold text-zinc-700 dark:text-zinc-300">Money flow</p>
        {loading ? (
          <Skeleton className="h-4 w-24 rounded" />
        ) : (
          <p className="text-[12px] text-zinc-400 dark:text-zinc-500">
            <span className="text-emerald-600 font-medium">{inPct}% in</span>
            {' · '}
            <span className="text-rose-500 font-medium">{outPct}% out</span>
          </p>
        )}
      </div>
      {loading ? (
        <Skeleton className="h-2.5 w-full rounded-full" />
      ) : (
        <div className="flex h-2.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div
            className="h-full rounded-l-full bg-emerald-400 transition-all duration-700"
            style={{ width: `${inPct}%` }}
          />
          <div
            className="h-full rounded-r-full bg-rose-400 transition-all duration-700"
            style={{ width: `${outPct}%` }}
          />
        </div>
      )}
    </div>
  )
}

/* ─── Quick Send recipient strip ─── */
function QuickSendStrip() {
  const { recipients, isLoading } = useRecipients()
  const shown = recipients.slice(0, 7)

  if (!isLoading && recipients.length === 0) return null

  return (
    <div className="rounded-2xl border border-zinc-100 bg-white px-4 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-zinc-900 dark:text-white">
          Quick Send
        </h2>
        <Link
          to="/recipients"
          className="flex items-center gap-0.5 text-[12px] font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400"
        >
          All <ArrowRight className="size-3" />
        </Link>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-0.5 scrollbar-none">
        {isLoading
          ? [0, 1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col items-center gap-2 shrink-0">
                <Skeleton className="size-11 rounded-full" />
                <Skeleton className="h-3 w-10 rounded" />
              </div>
            ))
          : shown.map((r) => {
              const initials = r.displayName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()
              return (
                <Link
                  key={r.id}
                  to={`/send?recipientId=${r.id}`}
                  className="group flex flex-col items-center gap-1.5 shrink-0"
                >
                  <Avatar className="size-11 ring-2 ring-transparent group-hover:ring-violet-300 transition-all dark:group-hover:ring-violet-700">
                    <AvatarImage
                      src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(r.displayName)}`}
                      alt={r.displayName}
                    />
                    <AvatarFallback className="bg-violet-100 text-violet-700 text-[12px] font-semibold dark:bg-violet-900 dark:text-violet-300">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="max-w-14 truncate text-center text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                    {r.displayName.split(' ')[0]}
                  </span>
                </Link>
              )
            })}
      </div>
    </div>
  )
}

/* ─── Recent activity panel ─── */
function TransactionsPanel({ totalCount }: { totalCount: number }) {
  const { transactions, isLoading } = useTransactionHistory(defaultFilters)
  const latest = useMemo(() => transactions.slice(0, 5), [transactions])
  const hasMore = totalCount > 5

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-zinc-900 dark:text-white">
          Recent activity
        </h2>
        <Link
          to="/history"
          className="text-[12px] font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400"
        >
          See all
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {isLoading ? (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                <Skeleton className="size-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-28 rounded" />
                  <Skeleton className="h-3 w-16 rounded" />
                </div>
                <Skeleton className="h-4 w-14 rounded" />
              </div>
            ))}
          </div>
        ) : latest.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-zinc-400">
            <Wallet className="mb-3 size-8 opacity-40" />
            <p className="text-[13px]">No transactions yet</p>
          </div>
        ) : (
          <>
            <div className="px-2 sm:px-3">
              {latest.map((tx, idx) => (
                <div key={tx.id}>
                  <TransactionListItem transaction={tx} />
                  {idx !== latest.length - 1 ? (
                    <div className="h-px w-full bg-zinc-100 dark:bg-zinc-800" />
                  ) : null}
                </div>
              ))}
            </div>
            {hasMore && (
              <Link
                to="/history"
                className="flex items-center justify-center gap-1.5 border-t border-zinc-100 py-3.5 text-[13px] font-medium text-violet-600 hover:bg-zinc-50 transition-colors dark:border-zinc-800 dark:text-violet-400 dark:hover:bg-zinc-800/50"
              >
                View all {totalCount} transactions <ArrowRight className="size-3.5" />
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/* ─── Home page ─── */
export function HomePage() {
  const { unreadCount } = useNotifications()
  const { user, loading } = useCurrentUser()
  const { data: balanceData, isLoading: balanceLoading } = useBalanceQuery(
    authService.isAuthenticated(),
  )
  const { transactions, isLoading: txLoading } = useTransactionHistory(defaultFilters)

  const formattedBalance = useMemo(() => {
    const raw = balanceData?.balance
    if (raw == null) return '$0.00'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(raw / 100)
  }, [balanceData?.balance])

  const greeting = useMemo(() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }, [])

  const { totalIn, totalOut, stats } = useMemo(() => {
    const fmt = (amount: number) =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount)

    const incomingAmount = transactions
      .filter((t) => t.type === 'received')
      .reduce((s, t) => s + Math.abs(t.amount), 0)
    const outgoingAmount = transactions
      .filter((t) => t.type === 'sent')
      .reduce((s, t) => s + Math.abs(t.amount), 0)

    return {
      totalIn: incomingAmount,
      totalOut: outgoingAmount,
      stats: { in: fmt(incomingAmount), out: fmt(outgoingAmount), count: transactions.length },
    }
  }, [transactions])

  return (
    <PageShell maxWidth="max-w-230" className="pt-5 md:pt-8">
      {/* Outer layout: single column on mobile/tablet, two-column sidebar on lg+ */}
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[1fr_360px] lg:gap-10 lg:items-start">

        {/* ── Left column ── */}
        <div className="flex flex-col gap-5">

          {/* Header */}
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="size-11 ring-2 ring-violet-100 dark:ring-violet-900">
                <AvatarImage
                  src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.firstName}%20${user?.lastName}`}
                  alt="Profile avatar"
                />
                <AvatarFallback className="bg-violet-100 text-violet-600 font-semibold dark:bg-violet-900 dark:text-violet-300">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-[13px] text-zinc-400 dark:text-zinc-500">{greeting},</p>
                <div className="text-[17px] font-semibold text-zinc-900 dark:text-white">
                  {loading ? (
                    <Skeleton className="h-5 w-20 rounded" />
                  ) : (
                    <span>{user?.firstName || 'there'}</span>
                  )}
                </div>
              </div>
            </div>
            <Link
              to="/notifications"
              className="relative grid size-10 place-items-center rounded-full text-zinc-500 hover:bg-zinc-100 active:scale-[0.97] transition-colors dark:text-zinc-400 dark:hover:bg-zinc-800"
              aria-label="Notifications"
            >
              <Bell className="size-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 size-2.5 rounded-full bg-violet-600 border-2 border-white dark:border-zinc-950" />
              )}
            </Link>
          </header>

          {/* Balance card */}
          <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-violet-600 via-purple-600 to-indigo-600 p-5 shadow-xl shadow-violet-500/25 sm:p-6">
            {/* Decorative orbs */}
            <div className="pointer-events-none absolute -top-10 -right-10 size-52 rounded-full bg-white/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-8 -left-8 size-36 rounded-full bg-indigo-400/20 blur-2xl" />

            <p className="relative text-[11px] font-semibold uppercase tracking-widest text-violet-200">
              Available Balance
            </p>
            <div className="relative mt-2">
              {balanceLoading ? (
                <Skeleton className="h-12 w-36 rounded-lg bg-white/20" />
              ) : (
                <p className="text-[42px] font-bold leading-none tracking-[-0.04em] text-white sm:text-[52px]">
                  {formattedBalance}
                </p>
              )}
            </div>

            <div className="relative mt-6 grid grid-cols-3 gap-1 sm:mt-8 sm:gap-2">
              <ActionButton icon={<PlusCircle className="size-5 sm:size-6" />} label="Add Money" to="/add-balance" />
              <ActionButton icon={<Send className="size-5 sm:size-6" />} label="Send" to="/send" />
              <ActionButton icon={<Wallet className="size-5 sm:size-6" />} label="Request" to="/receive" />
            </div>

            {/* Decorative card-style footer */}
            <div className="relative mt-5 flex items-center justify-between border-t border-white/15 pt-3.5">
              <p className="font-mono text-[13px] tracking-widest text-white/50">
                •••• •••• •••• 4291
              </p>
              <Wallet className="size-5 text-white/40" />
            </div>
          </div>

          {/* Stats row */}
          <div className="flex gap-3">
            <StatCard
              label="Money In"
              value={stats.in}
              icon={<TrendingUp className="size-4 text-emerald-500" />}
              borderColor="border-l-emerald-500"
              loading={txLoading}
            />
            <StatCard
              label="Money Out"
              value={stats.out}
              icon={<TrendingDown className="size-4 text-rose-500" />}
              borderColor="border-l-rose-500"
              loading={txLoading}
            />
            <StatCard
              label="Transfers"
              value={txLoading ? '' : String(stats.count)}
              icon={<ArrowRight className="size-4 text-violet-500" />}
              borderColor="border-l-violet-500"
              loading={txLoading}
            />
          </div>

          {/* Spending overview bar */}
          <SpendingBar totalIn={totalIn} totalOut={totalOut} loading={txLoading} />

          {/* Quick send — visible only on mobile/tablet (below lg), in right col on lg+ */}
          <div className="lg:hidden">
            <QuickSendStrip />
          </div>

          {/* Recent activity — visible only on mobile/tablet */}
          <div className="lg:hidden">
            <TransactionsPanel totalCount={stats.count} />
          </div>
        </div>

        {/* ── Right column (lg+ only) ── */}
        <div className="hidden lg:flex lg:flex-col lg:gap-5 lg:pt-[76px]">
          <QuickSendStrip />
          <TransactionsPanel totalCount={stats.count} />
        </div>
      </div>
    </PageShell>
  )
}
