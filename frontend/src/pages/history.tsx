import { TransactionListItem } from "@/components/transaction-list-item"
import { FilterPicker, FilterButton } from "@/components/transaction-filters"
import { useTransactionHistory, useTransactionHistoryFilters } from "@/hooks/use-transactions"
import { SettingsLayout } from "@/components/layout/settings-layout"

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
    <SettingsLayout
      title="History"
      backTo="/home"
      backLabel=""
      action={
        <FilterPicker
          filters={filters}
          draftFilters={draftFilters}
          setDraftFilters={setDraftFilters}
          applyFilters={applyFilters}
          clearFilters={clearFilters}
        >
          <FilterButton active={filtersActive} />
        </FilterPicker>
      }
      className="max-w-none"
    >
      {todayTransactions.length > 0 ? (
        <section className="mt-2">
          <h2 className="text-[13px] font-semibold uppercase tracking-widest text-zinc-400">Today</h2>
          <div className="mt-3 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div className="px-2 sm:px-3">
              {todayTransactions.map((transaction, idx) => (
                <div key={transaction.id}>
                  <TransactionListItem transaction={transaction} />
                  {idx !== todayTransactions.length - 1 ? (
                    <div className="h-px w-full bg-zinc-100 dark:bg-zinc-800" />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {olderTransactions.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-[13px] font-semibold uppercase tracking-widest text-zinc-400">Earlier</h2>
          <div className="mt-3 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div className="px-2 sm:px-3">
              {olderTransactions.map((transaction, idx) => (
                <div key={transaction.id}>
                  <TransactionListItem transaction={transaction} />
                  {idx !== olderTransactions.length - 1 ? (
                    <div className="h-px w-full bg-zinc-100 dark:bg-zinc-800" />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {transactions.length === 0 ? (
        <section className="mt-8 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 p-8 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
          <h2 className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100">
            {filtersActive ? "No matches found" : "No transactions yet"}
          </h2>
          <p className="mt-1 text-[13px] text-zinc-500 dark:text-zinc-400">
            {filtersActive
              ? "Try adjusting your filters to see more results."
              : "Your transaction history will appear here."}
          </p>
        </section>
      ) : null}
    </SettingsLayout>
  )
}
