import {
  ArrowDownLeft,
  ArrowUpRight,
  ReceiptText,
} from "lucide-react"

import type { Transaction } from "@/lib/transactions"

function formatAmount(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(Math.abs(amount))
}

function formatUtcDate(dateTimeUtc: string) {
  const date = new Date(dateTimeUtc)
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(date)
}

function typeLabel(type: Transaction["type"]) {
  if (type === "received") return "Received"
  if (type === "fee") return "Fee"
  return "Sent"
}

function typeIcon(type: Transaction["type"]) {
  if (type === "received") {
    return <ArrowDownLeft className="size-5 text-emerald-700" aria-hidden="true" />
  }

  if (type === "fee") {
    return <ReceiptText className="size-5 text-amber-700" aria-hidden="true" />
  }

  return <ArrowUpRight className="size-5 text-rose-700" aria-hidden="true" />
}

export function TransactionListItem({ transaction }: { transaction: Transaction }) {
  const amountLeaves = transaction.amount < 0

  return (
    <div className="flex items-start gap-4 py-5">
      <div className="grid size-12 shrink-0 place-items-center rounded-full bg-zinc-100 ring-1 ring-zinc-900/5">
        {typeIcon(transaction.type)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-[17px] font-medium tracking-[-0.02em] text-zinc-950">
          {transaction.counterpartyDisplayName}
        </div>
        {transaction.memo ? (
          <div className="mt-1 truncate text-[14px] text-zinc-600">
            {transaction.memo}
          </div>
        ) : null}
        <div className="mt-1 text-[14px] text-zinc-500">
          {formatUtcDate(transaction.dateTimeUtc)} UTC
        </div>
      </div>

      <div className="shrink-0 text-right">
        <div
          className={[
            "text-[17px] font-semibold tracking-[-0.02em]",
            amountLeaves ? "text-rose-600" : "text-emerald-600",
          ].join(" ")}
        >
          {amountLeaves ? "-" : "+"}
          {formatAmount(transaction.amount)}
        </div>
        <div className="mt-1 text-[14px] text-zinc-500">
          {typeLabel(transaction.type)}
        </div>
      </div>
    </div>
  )
}
