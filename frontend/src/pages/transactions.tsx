import { TransactionListItem } from "@/components/transaction-list-item"
import { FilterPicker, FilterButton } from "@/components/transaction-filters"
import { useTransactionHistory, useTransactionHistoryFilters } from "@/hooks/use-transactions"
import { PageShell } from "@/components/layout/page-shell"

export function TransactionsPage() {
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
    <PageShell>
      <header className="flex items-center justify-between">
        <h1 className="text-[44px] font-semibold tracking-[-0.04em] text-zinc-950 dark:text-zinc-50 md:text-[48px]">
          Transactions
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
        <section className="mt-12">
          <h2 className="text-[44px] font-medium tracking-[-0.04em] text-zinc-800 dark:text-zinc-200">Today</h2>
          <div className="mt-4 overflow-hidden rounded-3xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div className="px-4 sm:px-5">
              {todayTransactions.map((transaction, idx) => (
                <div key={transaction.id}>
                  <TransactionListItem transaction={transaction} />
                  {idx !== todayTransactions.length - 1 ? (
                    <div className="h-px w-full bg-zinc-200/70 dark:bg-zinc-800" />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {olderTransactions.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-[32px] font-medium tracking-[-0.03em] text-zinc-700 dark:text-zinc-300">Earlier</h2>
          <div className="mt-4 overflow-hidden rounded-3xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
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
        <section className="mt-10 rounded-3xl border border-dashed border-zinc-300 bg-white/70 p-8 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {filtersActive ? "No matches found" : "No transactions found"}
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {filtersActive
              ? "Try adjusting your filters to see more results."
              : "Your transaction history will appear here."}
          </p>
        </section>
      ) : null}
    </PageShell>
  )
}
