import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import logger from "@/lib/logger"
import { queryKeys } from "@/lib/query-keys"
import type { PinPresenceResponse } from "@/lib/types"
import { authService } from "@/services/auth-service"

export function useCheckPin() {
  return useMutation({
    mutationFn: (pin: string) => authService.checkPin(pin),
    onError: (error) => {
      logger.error({ error }, "Check PIN mutation failed")
    },
  })
}

export function useResetPin() {
  return useMutation({
    mutationFn: (pin: string) => authService.setPin(pin),
    onError: (error) => {
      logger.error({ error }, "Reset PIN mutation failed")
    },
  })
}

export function usePinPresenceQuery(enabled = true) {
  return useQuery<PinPresenceResponse, Error>({
    queryKey: queryKeys.hasPin,
    queryFn: () => authService.getPinPresence(),
    staleTime: 5 * 60 * 1000,
    enabled,
  })
}

export function usePrefetchPinPresence() {
  const queryClient = useQueryClient()

  return async () => {
    try {
      await queryClient.prefetchQuery({
        queryKey: queryKeys.hasPin,
        queryFn: () => authService.getPinPresence(),
      })
      return queryClient.getQueryData<PinPresenceResponse>(queryKeys.hasPin) ?? null
    } catch (error) {
      logger.error({ error }, "Prefetch PIN presence failed")
      throw error
    }
  }
}
