import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authService } from '@/services/auth-service'
import { queryKeys } from '@/lib/query-keys'
import logger from '@/lib/logger'
import type { SignInValues } from '@/lib/types'
import { usePrefetchBalance } from '@/hooks/use-balance'

export function useLogin() {
  const queryClient = useQueryClient()
  const prefetchBalance = usePrefetchBalance()

  return useMutation({
    mutationFn: (credentials: SignInValues) => authService.login(credentials),
    onSuccess: async () => {
      await queryClient.prefetchQuery({
        queryKey: queryKeys.currentUser,
        queryFn: () => authService.getUser(),
      })
      await prefetchBalance()
    },
    onError: (error) => {
      logger.error({ error }, 'Login mutation failed')
    }
  })
}
