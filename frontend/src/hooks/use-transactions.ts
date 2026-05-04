import { useMemo, useState } from "react"
import { mockTransactions } from "@/lib/transactions"
import type { Transaction, Filters } from "@/lib/types"

export const defaultFilters: Filters = {
  dateFrom: "",
  dateTo: "",
  types: [],
  amountMin: "",
  amountMax: "",
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

function sortByNewest(transactions: Transaction[]) {
  return [...transactions].sort(
    (a, b) => Date.parse(b.dateTimeUtc) - Date.parse(a.dateTimeUtc)
  )
}

export function useTransactionHistoryFilters() {
  const [filters, setFilters] = useState<Filters>(defaultFilters)
  const [draftFilters, setDraftFilters] = useState<Filters>(defaultFilters)

  const filtersActive = useMemo(() => {
    return (
      filters.dateFrom !== defaultFilters.dateFrom ||
      filters.dateTo !== defaultFilters.dateTo ||
      filters.types.length > 0 ||
      filters.amountMin !== defaultFilters.amountMin ||
      filters.amountMax !== defaultFilters.amountMax
    )
  }, [filters])

  const applyFilters = () => setFilters(draftFilters)
  const clearFilters = () => {
    setDraftFilters(defaultFilters)
    setFilters(defaultFilters)
  }

  return {
    filters,
    draftFilters,
    setDraftFilters,
    applyFilters,
    clearFilters,
    filtersActive,
  }
}

export function useTransactionHistory(filters: Filters) {
  const transactions = useMemo(
    () => sortByNewest(mockTransactions).filter((tx) => matchesFilters(tx, filters)),
    [filters]
  )

  const todayTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const now = new Date()
      const utcToday = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`
      return tx.dateTimeUtc.startsWith(utcToday)
    })
  }, [transactions])

  const olderTransactions = useMemo(() => {
    return transactions.filter((tx) => !todayTransactions.some((todayTx) => todayTx.id === tx.id))
  }, [transactions, todayTransactions])

  return {
    transactions,
    todayTransactions,
    olderTransactions,
  }
}
