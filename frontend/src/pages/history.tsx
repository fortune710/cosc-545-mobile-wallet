import { ArrowLeft } from "lucide-react"
import { Link } from "react-router-dom"

import { TransactionListItem } from "@/components/transaction-list-item"
import { FilterPicker, FilterButton } from "@/components/transaction-filters"
import { useTransactionHistory, useTransactionHistoryFilters } from "@/hooks/use-transactions"

export function HistoryPage() {
  const {
    filters,
    draftFilters,
    setDraftFilters,
    applyFilters,
    clearFilters,
    filtersActive,
  } = useTransactionHistoryFilters()

  const { todayTransactions, olderTransactions, transactions } = useTransactionHistory(filters)

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
        <h1 className="text-[24px] font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
          History
        </h1>

        <FilterPicker
          filters={filters}
          draftFilters={draftFilters}
          setDraftFilters={setDraftFilters}
          applyFilters={applyFilters}
          clearFilters={clearFilters}
        >
          <FilterButton active={filtersActive} />
        </FilterPicker>
      </header>

      {todayTransactions.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-[15px] font-bold uppercase tracking-wider text-zinc-500">Today</h2>
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
        <section className="mt-10">
          <h2 className="text-[20px] font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Earlier</h2>
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
          <h2 className="text-lg font-semibold text-zinc-900">
            {filtersActive ? "No matches found" : "No transactions found"}
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            {filtersActive
              ? "Try adjusting your filters to see more results."
              : "Your transaction history will appear here."}
          </p>
        </section>
      ) : null}
    </main>
  )
}
