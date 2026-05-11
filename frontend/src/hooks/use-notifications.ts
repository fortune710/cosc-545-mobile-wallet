import { useCallback, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { ApiNotification, NotificationItem, PaginatedResponse } from '@/lib/types'
import { authService } from '@/services/auth-service'
import { notificationsService } from '@/services/notifications-service'
import logger from '@/lib/logger'
import { toast } from 'sonner'

const LAST_READ_KEY = 'wallet_notifications_last_read'

/**
 * Maps the backend notification payload to the app's notification view model.
 */
function mapNotification(raw: ApiNotification, lastReadTime: number): NotificationItem {
  const notifTime = new Date(raw.created_at).getTime()
  return {
    id: String(raw.id),
    type: raw.type as NotificationItem['type'],
    title: raw.title,
    description: raw.body,
    createdAt: raw.created_at,
    userId: raw.user,
    isRead: notifTime <= lastReadTime,
  }
}

/**
 * React Query hook for persisted and realtime notifications.
 */
export function useNotifications() {
  const queryClient = useQueryClient()
  const lastReadTimestamp = localStorage.getItem(LAST_READ_KEY)
  const lastReadTime = lastReadTimestamp ? new Date(lastReadTimestamp).getTime() : 0

  const { data, isLoading } = useQuery<PaginatedResponse<ApiNotification>>({
    queryKey: queryKeys.notifications(),
    queryFn: () => notificationsService.getNotifications(),
    enabled: authService.isAuthenticated(),
  })

  useEffect(() => {
    if (!authService.isAuthenticated()) return

    const socketUrl = notificationsService.getNotificationSocketUrl()
    if (!socketUrl) return

    logger.info({ socketUrl }, 'Opening notifications websocket')
    const socket = new WebSocket(socketUrl)

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as ApiNotification
        const mapped = mapNotification(payload, lastReadTime)

        queryClient.setQueryData<PaginatedResponse<ApiNotification>>(queryKeys.notifications(), (current) => {
          const existingResults = current?.results ?? []
          const deduped = existingResults.filter((item) => String(item.id) !== mapped.id)
          return {
            count: current?.count ?? deduped.length + 1,
            next: current?.next ?? null,
            previous: current?.previous ?? null,
            results: [payload, ...deduped],
          }
        })

        toast(mapped.title, {
          description: mapped.description,
        })
      } catch (error) {
        logger.error({ error, data: event.data }, 'Failed to process notification websocket payload')
      }
    }

    socket.onerror = (event) => {
      logger.warn({ event }, 'Notifications websocket encountered an error')
    }

    socket.onclose = (event) => {
      logger.info({ code: event.code, reason: event.reason }, 'Notifications websocket closed')
    }

    return () => {
      logger.info('Closing notifications websocket')
      socket.close()
    }
  }, [lastReadTime, queryClient])

  const notifications: NotificationItem[] = (data?.results ?? [])
    .map((n) => mapNotification(n, lastReadTime))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const unreadCount = notifications.filter((n) => !n.isRead).length

  const markAllAsRead = useCallback(() => {
    const now = new Date().toISOString()
    localStorage.setItem(LAST_READ_KEY, now)
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications() })
  }, [queryClient])

  return {
    notifications,
    isLoading,
    unreadCount,
    markAllAsRead,
    refresh: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications() }),
  }
}
