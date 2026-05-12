import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { transactionService } from '@/services/transaction-service'
import { queryKeys } from '@/lib/query-keys'
import type { Transaction, Filters, TransactionFilters } from '@/lib/types'
import { authService } from '@/services/auth-service'

export const defaultFilters: Filters = {
  dateFrom: '',
  dateTo: '',
  types: [],
  amountMin: '',
  amountMax: '',
}

function mapTypeToLocal(apiType: string): Transaction['type'] {
  if (apiType === 'payment_sent') return 'sent'
  if (apiType === 'payment_received' || apiType === 'funding' || apiType === 'request_payment') return 'received'
  return 'sent'
}

function mapStatusToLocal(apiStatus: string): Transaction['status'] {
  if (apiStatus === 'completed') return 'completed'
  if (apiStatus === 'pending') return 'pending'
  return 'failed'
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

  return { filters, draftFilters, setDraftFilters, applyFilters, clearFilters, filtersActive }
}

export function useTransactionHistory(filters: Filters) {
  const apiFilters: TransactionFilters = {
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    transactionType: filters.types.length === 1 ? (filters.types[0] === 'sent' ? 'payment_sent' : 'payment_received') : undefined,
    amountMin: filters.amountMin || undefined,
    amountMax: filters.amountMax || undefined,
    pageSize: 100,
  }

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.transactions(apiFilters),
    queryFn: () => transactionService.getTransactions(apiFilters),
    enabled: authService.isAuthenticated(),
  })

  const transactions: Transaction[] = useMemo(() => {
    if (!data?.results) return []
    return data.results.map((tx) => ({
      id: tx.id,
      dateTimeUtc: tx.date_time_utc,
      type: mapTypeToLocal(tx.type),
      counterpartyDisplayName: tx.counterparty_display_name || 'Unknown',
      amount: parseFloat(tx.amount),
      memo: tx.memo,
      status: mapStatusToLocal(tx.status),
    }))
  }, [data])

  const todayTransactions = useMemo(() => {
    const now = new Date()
    const utcToday = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`
    return transactions.filter((tx) => tx.dateTimeUtc.startsWith(utcToday))
  }, [transactions])

  const olderTransactions = useMemo(() => {
    return transactions.filter((tx) => !todayTransactions.some((t) => t.id === tx.id))
  }, [transactions, todayTransactions])

  return { transactions, todayTransactions, olderTransactions, isLoading, error }
}
