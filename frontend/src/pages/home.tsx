import {
  MessageCircle,
  PlusCircle,
  Send,
  Wallet,
  User,
} from "lucide-react"
import type { ReactNode } from "react"
import { Link } from "react-router-dom"

import { TransactionListItem } from "@/components/transaction-list-item"
import { mockTransactions } from "@/lib/transactions"

function ActionButton({
  icon,
  label,
  to,
}: {
  icon: ReactNode
  label: string
  to?: string
}) {
  if (to) {
    return (
      <Link to={to} className="group flex flex-col items-center gap-3 text-center">
        <span className="grid size-16 place-items-center rounded-full bg-primary/15 text-primary transition-all group-hover:bg-primary/25 group-hover:scale-105 group-active:scale-95">
          {icon}
        </span>
        <span className="max-w-[10ch] text-[15px] font-semibold leading-[1.15] tracking-[-0.01em] text-zinc-900">
          {label}
        </span>
      </Link>
    )
  }

  return (
    <button
      type="button"
      className="group flex flex-col items-center gap-3 text-center"
    >
        <span className="grid size-16 place-items-center rounded-full bg-primary/15 text-primary transition-all group-hover:bg-primary/25 group-hover:scale-105 group-active:scale-95">
          {icon}
        </span>
      <span className="max-w-[10ch] text-[15px] font-semibold leading-[1.15] tracking-[-0.01em] text-zinc-900">
        {label}
      </span>
    </button>
  )
}

function TransactionsPanel() {
  const latest = [...mockTransactions]
    .sort((a, b) => Date.parse(b.dateTimeUtc) - Date.parse(a.dateTimeUtc))
    .slice(0, 2)

  return (
    <section className="pb-28 md:pb-10">
      <div className="flex items-end justify-between">
        <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-zinc-950">
          Latest transactions
        </h2>
        <Link
          to="/history"
          className="text-[16px] font-medium text-zinc-950 underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-400"
        >
          See more
        </Link>
      </div>

      <div className="mt-4 overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-[0_1px_0_rgba(0,0,0,0.03)]">
        <div className="px-4 sm:px-5">
          {latest.map((tx, idx) => (
            <div key={tx.id}>
              <TransactionListItem transaction={tx} />
              {idx !== latest.length - 1 ? (
                <div className="h-px w-full bg-zinc-200/70" />
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function HomePage() {
  return (
    <main className="mx-auto w-full max-w-[920px] box-border px-4 pt-10 sm:px-5 md:px-8 md:pt-12">
      <div className="grid gap-10 md:grid-cols-2 md:gap-14">
        <section>
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="grid size-12 place-items-center rounded-full ring-2 ring-lime-300/70">
                <User className="size-6 text-zinc-700" aria-hidden="true" />
              </div>
              <div className="text-left">
                <div className="text-[22px] font-medium tracking-[-0.02em] text-zinc-950">
                  Hi,
                  <span className="ml-1 font-semibold">Alex</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              className="grid size-11 place-items-center rounded-full text-zinc-600 hover:bg-zinc-100 active:scale-[0.98]"
              aria-label="Messages"
            >
              <MessageCircle className="size-6" aria-hidden="true" />
            </button>
          </header>

          <div className="mt-14 text-center md:mt-16">
            <div className="text-[16px] font-medium tracking-[0.02em] text-zinc-500">
              Available Balance
            </div>

            <div className="mt-5 text-[64px] font-semibold leading-[0.95] tracking-[-0.05em] text-zinc-950 md:text-[70px]">
              $1,987.18
            </div>
          </div>

          <div className="mt-14 grid grid-cols-3 gap-6 md:mt-16 md:gap-8">
            <ActionButton
              icon={<PlusCircle className="size-6" aria-hidden="true" />}
              label="Add Balance"
              to="/add-balance"
            />
            <ActionButton
              icon={<Send className="size-6" aria-hidden="true" />}
              label="Send"
              to="/send"
            />
            <ActionButton
              icon={<Wallet className="size-6" aria-hidden="true" />}
              label="Receive"
              to="/receive"
            />
          </div>
        </section>

        <div className="min-w-0 md:pt-2">
          <TransactionsPanel />
        </div>
      </div>
    </main>
  )
}
