import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { authService } from '@/services/auth-service'
import type { AuthUser } from '@/lib/types'
import { UnauthorizedError, TokenExpiredError } from '@/lib/errors/auth'

export function useCurrentUser() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const query = useQuery<AuthUser, Error>({
    queryKey: ['currentUser'],
    queryFn: () => authService.getUser(),
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: false,
    enabled: authService.isAuthenticated(),
  })

  useEffect(() => {
    if (query.error) {
      if (query.error instanceof UnauthorizedError || query.error instanceof TokenExpiredError) {
        authService.logout()
        queryClient.removeQueries({ queryKey: ['currentUser'] })
        navigate('/login', { replace: true })
      }
    }
  }, [query.error, navigate])

  return {
    user: query.data ?? null,
    loading: query.isLoading,
    error: query.error,
    refreshUser: query.refetch,
    isAuthenticated: authService.isAuthenticated() && !!query.data
  }
}
