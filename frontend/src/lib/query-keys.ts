import type { TransactionFilters } from './types'

export const queryKeys = {
  currentUser: ['currentUser'] as const,
  hasPin: ['hasPin'] as const,
  balance: ['balance'] as const,
  transactions: (filters?: TransactionFilters) => ['transactions', filters] as const,
  notifications: (page?: number) => ['notifications', page ?? 1] as const,
  recipients: (page?: number, query?: string) => ['recipients', page ?? 1, query ?? ''] as const,
  recipientSearch: (query?: string) => ['recipient-search', query ?? ''] as const,
} as const
