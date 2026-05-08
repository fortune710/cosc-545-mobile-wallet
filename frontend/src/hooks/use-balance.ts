import { useQuery, useQueryClient } from "@tanstack/react-query"

import logger from "@/lib/logger"
import { queryKeys } from "@/lib/query-keys"
import type { BalanceResponse } from "@/lib/types"
import { transactionService } from "@/services/transaction-service"

export function useBalanceQuery(enabled = true) {
  return useQuery<BalanceResponse, Error>({
    queryKey: queryKeys.balance,
    queryFn: () => transactionService.getBalance(),
    staleTime: 5 * 60 * 1000,
    enabled,
  })
}

export function usePrefetchBalance() {
  const queryClient = useQueryClient()

  return async () => {
    try {
      await queryClient.prefetchQuery({
        queryKey: queryKeys.balance,
        queryFn: () => transactionService.getBalance(),
      })
      return queryClient.getQueryData<BalanceResponse>(queryKeys.balance) ?? null
    } catch (error) {
      logger.error({ error }, "Prefetch balance failed")
      throw error
    }
  }
}
