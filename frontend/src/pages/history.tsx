import { useMemo, useState, type Dispatch, type SetStateAction } from "react"
import { ArrowLeft, Filter } from "lucide-react"
import { Link } from "react-router-dom"

import { TransactionListItem } from "@/components/transaction-list-item"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { mockTransactions, type Transaction, type TransactionType } from "@/lib/transactions"

type Filters = {
  dateFrom: string
  dateTo: string
  types: TransactionType[]
  amountMin: string
  amountMax: string
}

const defaultFilters: Filters = {
  dateFrom: "",
  dateTo: "",
  types: [],
  amountMin: "",
  amountMax: "",
}

function sortByNewest(transactions: Transaction[]) {
  return [...transactions].sort(
    (a, b) => Date.parse(b.dateTimeUtc) - Date.parse(a.dateTimeUtc)
  )
}

function matchesFilters(transaction: Transaction, filters: Filters) {
  const txDate = Date.parse(transaction.dateTimeUtc)
  const fromUtc = filters.dateFrom ? Date.parse(`${filters.dateFrom}T00:00:00Z`) : null
  const toUtc = filters.dateTo ? Date.parse(`${filters.dateTo}T23:59:59Z`) : null

  if (fromUtc !== null && txDate < fromUtc) return false
  if (toUtc !== null && txDate > toUtc) return false
  if (filters.types.length > 0 && !filters.types.includes(transaction.type)) return false

  const min = filters.amountMin ? Number(filters.amountMin) : null
  const max = filters.amountMax ? Number(filters.amountMax) : null
  const absoluteAmount = Math.abs(transaction.amount)

  if (min !== null && !Number.isNaN(min) && absoluteAmount < min) return false
  if (max !== null && !Number.isNaN(max) && absoluteAmount > max) return false

  return true
}

function FiltersBody({
  draftFilters,
  setDraftFilters,
}: {
  draftFilters: Filters
  setDraftFilters: Dispatch<SetStateAction<Filters>>
}) {
  function toggleType(type: TransactionType) {
    setDraftFilters((current) => {
      const isActive = current.types.includes(type)
      return {
        ...current,
        types: isActive
          ? current.types.filter((value) => value !== type)
          : [...current.types, type],
      }
    })
  }

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-zinc-600">
          Date range
        </h3>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs text-zinc-500">From</span>
            <Input
              type="date"
              value={draftFilters.dateFrom}
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  dateFrom: event.target.value,
                }))
              }
              className="h-10 rounded-xl border-zinc-300 bg-white/80"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-zinc-500">To</span>
            <Input
              type="date"
              value={draftFilters.dateTo}
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  dateTo: event.target.value,
                }))
              }
              className="h-10 rounded-xl border-zinc-300 bg-white/80"
            />
          </label>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-zinc-600">
          Type
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {(["sent", "received", "fee"] as const).map((type) => {
            const active = draftFilters.types.includes(type)
            return (
              <button
                key={type}
                type="button"
                onClick={() => toggleType(type)}
                className={[
                  "rounded-2xl border px-3 py-1.5 text-sm capitalize transition",
                  active
                    ? "border-lime-400 bg-lime-100/80 text-lime-900"
                    : "border-zinc-300 bg-white/70 text-zinc-700 hover:bg-zinc-100",
                ].join(" ")}
              >
                {type}
              </button>
            )
          })}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-zinc-600">
          Amount range
        </h3>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs text-zinc-500">Min (absolute)</span>
            <Input
              type="number"
              min="0"
              placeholder="0"
              value={draftFilters.amountMin}
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  amountMin: event.target.value,
                }))
              }
              className="h-10 rounded-xl border-zinc-300 bg-white/80"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-zinc-500">Max (absolute)</span>
            <Input
              type="number"
              min="0"
              placeholder="1000"
              value={draftFilters.amountMax}
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  amountMax: event.target.value,
                }))
              }
              className="h-10 rounded-xl border-zinc-300 bg-white/80"
            />
          </label>
        </div>
      </section>
    </div>
  )
}

export function HistoryPage() {
  const [filters, setFilters] = useState<Filters>(defaultFilters)
  const [draftFilters, setDraftFilters] = useState<Filters>(defaultFilters)

  const transactions = useMemo(
    () => sortByNewest(mockTransactions).filter((tx) => matchesFilters(tx, filters)),
    [filters]
  )

  const todayTransactions = transactions.filter((tx) => {
    const now = new Date()
    const utcToday = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`
    return tx.dateTimeUtc.startsWith(utcToday)
  })

  const olderTransactions = transactions.filter((tx) => !todayTransactions.includes(tx))

  function applyFilters() {
    setFilters(draftFilters)
  }

  function clearFilters() {
    setDraftFilters(defaultFilters)
    setFilters(defaultFilters)
  }

  return (
    <main className="mx-auto w-full max-w-[920px] box-border px-4 pt-10 pb-28 sm:px-5 md:px-8 md:pt-12 md:pb-10">
      <header className="flex items-center justify-between">
        <Link
          to="/home"
          className="grid size-11 place-items-center rounded-full text-zinc-900 hover:bg-zinc-100"
          aria-label="Back to home"
        >
          <ArrowLeft className="size-7" />
        </Link>
        <h1 className="text-[44px] font-semibold tracking-[-0.04em] text-zinc-950 md:text-[48px]">
          History
        </h1>

        <div className="md:hidden">
          <Drawer>
            <DrawerTrigger asChild>
              <button
                type="button"
                className="grid size-11 place-items-center rounded-full text-lime-700 hover:bg-lime-100"
                aria-label="Open filters"
                onClick={() => setDraftFilters(filters)}
              >
                <Filter className="size-6" />
              </button>
            </DrawerTrigger>
            <DrawerContent className="rounded-t-3xl border-zinc-200 bg-zinc-50 pb-5">
              <DrawerHeader className="px-5 pt-3 text-left">
                <DrawerTitle className="text-xl font-semibold text-zinc-950">
                  Filter Transactions
                </DrawerTitle>
              </DrawerHeader>
              <div className="px-5 pb-2">
                <FiltersBody
                  draftFilters={draftFilters}
                  setDraftFilters={setDraftFilters}
                />
                <div className="mt-6 grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={clearFilters} className="h-10 rounded-xl">
                    Reset
                  </Button>
                  <Button onClick={applyFilters} className="h-10 rounded-xl">
                    Apply
                  </Button>
                </div>
              </div>
            </DrawerContent>
          </Drawer>
        </div>

        <div className="hidden md:block">
          <Dialog>
            <DialogTrigger asChild>
              <button
                type="button"
                className="grid size-11 place-items-center rounded-full text-lime-700 hover:bg-lime-100"
                aria-label="Open filters"
                onClick={() => setDraftFilters(filters)}
              >
                <Filter className="size-6" />
              </button>
            </DialogTrigger>
            <DialogContent
              showCloseButton={false}
              className="top-0 right-0 left-auto h-svh w-[420px] max-w-[92vw] translate-x-0 translate-y-0 rounded-none border-l border-zinc-200 bg-zinc-50 p-0 ring-0"
            >
              <DialogHeader className="border-b border-zinc-200 px-6 py-5">
                <DialogTitle className="text-xl font-semibold text-zinc-950">
                  Filter Transactions
                </DialogTitle>
              </DialogHeader>
              <div className="flex h-[calc(100svh-81px)] flex-col">
                <div className="flex-1 overflow-y-auto px-6 py-5">
                  <FiltersBody
                    draftFilters={draftFilters}
                    setDraftFilters={setDraftFilters}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 border-t border-zinc-200 bg-white/80 px-6 py-4">
                  <Button variant="outline" onClick={clearFilters} className="h-10 rounded-xl">
                    Reset
                  </Button>
                  <Button onClick={applyFilters} className="h-10 rounded-xl">
                    Apply
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {todayTransactions.length > 0 ? (
        <section className="mt-12">
          <h2 className="text-[44px] font-medium tracking-[-0.04em] text-zinc-800">Today</h2>
          <div className="mt-4 overflow-hidden rounded-3xl border border-zinc-200 bg-white">
            <div className="px-4 sm:px-5">
              {todayTransactions.map((transaction, idx) => (
                <div key={transaction.id}>
                  <TransactionListItem transaction={transaction} />
                  {idx !== todayTransactions.length - 1 ? (
                    <div className="h-px w-full bg-zinc-200/70" />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {olderTransactions.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-[32px] font-medium tracking-[-0.03em] text-zinc-700">Earlier</h2>
          <div className="mt-4 overflow-hidden rounded-3xl border border-zinc-200 bg-white">
            <div className="px-4 sm:px-5">
              {olderTransactions.map((transaction, idx) => (
                <div key={transaction.id}>
                  <TransactionListItem transaction={transaction} />
                  {idx !== olderTransactions.length - 1 ? (
                    <div className="h-px w-full bg-zinc-200/70" />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {transactions.length === 0 ? (
        <section className="mt-10 rounded-3xl border border-dashed border-zinc-300 bg-white/70 p-8 text-center">
          <h2 className="text-lg font-semibold text-zinc-900">No transactions found</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Adjust the filters and try again.
          </p>
        </section>
      ) : null}
    </main>
  )
}
