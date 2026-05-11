import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authService } from '@/services/auth-service'
import { queryKeys } from '@/lib/query-keys'
import logger from '@/lib/logger'
import { usePrefetchBalance } from '@/hooks/use-balance'

export function useLoginStart() {
  return useMutation({
    mutationFn: (credentials: { email: string; password: string }) =>
      authService.loginStart(credentials),
    onError: (error) => {
      logger.error({ error }, 'Login start mutation failed')
    },
  })
}

export function useLoginVerifyMfa() {
  const queryClient = useQueryClient()
  const prefetchBalance = usePrefetchBalance()

  return useMutation({
    mutationFn: (payload: { flow_token: string; mfa_code: string }) =>
      authService.loginVerifyMfa(payload),
    onSuccess: async () => {
      await queryClient.prefetchQuery({
        queryKey: queryKeys.currentUser,
        queryFn: () => authService.getUser(),
      })
      await prefetchBalance()
    },
    onError: (error) => {
      logger.error({ error }, 'Login verify MFA mutation failed')
    },
  })
}
