import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { config } from '@/lib/app-config'
import { authService } from '@/services/auth-service'
import { queryKeys } from '@/lib/query-keys'
import logger from '@/lib/logger'

function decodeJwtPayload(token: string) {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const decoded = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='))
    return JSON.parse(decoded) as { exp?: number }
  } catch {
    return null
  }
}

function getAccessExpiryMs() {
  const token = authService.getAccessToken()
  if (!token) return 0
  const payload = decodeJwtPayload(token)
  return payload?.exp ? payload.exp * 1000 : 0
}

export function useSessionLifecycle() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const refreshInFlight = useRef(false)
  const idleLogoutShown = useRef(false)

  useEffect(() => {
    const markActivity = () => {
      if (!authService.isAuthenticated()) return
      authService.markSessionActivity()
      idleLogoutShown.current = false
    }

    const forceLogout = async (message: string) => {
      if (idleLogoutShown.current) return
      idleLogoutShown.current = true
      try {
        await authService.logout()
      } finally {
        queryClient.removeQueries({ queryKey: queryKeys.currentUser })
        queryClient.removeQueries({ queryKey: queryKeys.sessions })
        toast.error('Session ended', { description: message })
        navigate('/login', { replace: true })
      }
    }

    const maybeRefreshSession = async () => {
      if (!authService.isAuthenticated() || refreshInFlight.current) return

      const lastActivity = authService.getLastSessionActivity()
      const now = Date.now()
      if (!lastActivity) {
        authService.markSessionActivity()
        return
      }

      if (now - lastActivity > config.sessionInactivityMs) {
        await forceLogout('You were signed out after being inactive for too long.')
        return
      }

      if (document.visibilityState !== 'visible') return

      const accessExpiryMs = getAccessExpiryMs()
      if (!accessExpiryMs || accessExpiryMs - now > config.sessionRefreshThresholdMs) return

      refreshInFlight.current = true
      try {
        await authService.refreshSession()
        await queryClient.invalidateQueries({ queryKey: queryKeys.sessions })
      } catch (error) {
        logger.error({ error }, 'Active session refresh failed')
        await forceLogout(error instanceof Error ? error.message : 'Your session could not be refreshed.')
      } finally {
        refreshInFlight.current = false
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void maybeRefreshSession()
      }
    }

    const activityEvents: Array<keyof WindowEventMap> = [
      'pointerdown',
      'keydown',
      'focus',
      'mousemove',
      'scroll',
      'touchstart',
    ]

    activityEvents.forEach((eventName) => window.addEventListener(eventName, markActivity, { passive: true }))
    document.addEventListener('visibilitychange', handleVisibilityChange)
    markActivity()
    const intervalId = window.setInterval(() => {
      void maybeRefreshSession()
    }, config.sessionRefreshCheckIntervalMs)

    return () => {
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, markActivity))
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.clearInterval(intervalId)
    }
  }, [navigate, queryClient])
}
