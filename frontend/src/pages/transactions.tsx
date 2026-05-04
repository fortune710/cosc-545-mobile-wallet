import { TransactionListItem } from "@/components/transaction-list-item"
import { FilterPicker, FilterButton } from "@/components/transaction-filters"
import { useTransactionHistory, useTransactionHistoryFilters } from "@/hooks/use-transactions"

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
    <main className="mx-auto w-full max-w-[920px] box-border px-4 pt-10 pb-28 sm:px-5 md:px-8 md:pt-12 md:pb-10">
      <header className="flex items-center justify-between">
        <h1 className="text-[44px] font-semibold tracking-[-0.04em] text-zinc-950 md:text-[48px]">
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
