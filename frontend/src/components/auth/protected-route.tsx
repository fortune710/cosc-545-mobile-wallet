import { Navigate, useLocation } from 'react-router-dom'
import { authService } from '@/services/auth-service'
import { useCurrentUser } from '@/hooks/use-current-user'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  useCurrentUser()
  const location = useLocation()
  const isAuthenticated = authService.isAuthenticated()

  // If no access token, redirect to login immediately
  if (!isAuthenticated) {
    return <Navigate to={`/login?returnTo=${encodeURIComponent(location.pathname)}`} replace />
  }

  // Optional: You could show a loading screen while the first profile fetch happens
  // if (loading && !user) {
  //   return <div className="flex min-h-svh items-center justify-center">Loading...</div>
  // }

  return <>{children}</>
}
