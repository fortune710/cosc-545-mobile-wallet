import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { authService } from '@/services/auth-service'
import { notificationsService } from '@/services/notifications-service'
import { queryKeys } from '@/lib/query-keys'
import type { ApiNotification, NotificationItem, PaginatedResponse } from '@/lib/types'
import logger from '@/lib/logger'

const LAST_READ_KEY = 'wallet_notifications_last_read'

type SessionRealtimeEvent = {
  event_type: 'session.updated'
  action: 'created' | 'invalidated' | 'refreshed'
  session_key: string
}

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

function isSessionRealtimeEvent(payload: unknown): payload is SessionRealtimeEvent {
  return Boolean(
    payload &&
      typeof payload === 'object' &&
      (payload as SessionRealtimeEvent).event_type === 'session.updated' &&
      typeof (payload as SessionRealtimeEvent).action === 'string' &&
      typeof (payload as SessionRealtimeEvent).session_key === 'string',
  )
}

function getSocketCloseMessage(code: number, reason: string) {
  if (reason) return reason
  if (code === 4401) return 'Your realtime session is no longer authorized. Please sign in again.'
  if (code === 1006) return 'Realtime connection was lost unexpectedly.'
  if (code === 1008) return 'Realtime connection was rejected by the server.'
  return `Realtime connection closed (${code}).`
}

export function useNotificationRealtime() {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!authService.isAuthenticated()) return

    const socketUrl = notificationsService.getNotificationSocketUrl()
    if (!socketUrl) return

    const lastReadTimestamp = localStorage.getItem(LAST_READ_KEY)
    const lastReadTime = lastReadTimestamp ? new Date(lastReadTimestamp).getTime() : 0

    logger.info({ socketUrl }, 'Opening notifications websocket')
    const socket = new WebSocket(socketUrl)

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as ApiNotification | SessionRealtimeEvent

        if (isSessionRealtimeEvent(payload)) {
          void queryClient.invalidateQueries({ queryKey: queryKeys.sessions })
          return
        }

        const mapped = mapNotification(payload, lastReadTime)

        queryClient.setQueryData<PaginatedResponse<ApiNotification>>(queryKeys.notifications(), (current) => {
          const existingResults = current?.results ?? []
          const deduped = existingResults.filter((item) => String(item.id) !== mapped.id)
          return {
            count: (current?.count ?? deduped.length) + (deduped.length === existingResults.length ? 1 : 0),
            next: current?.next ?? null,
            previous: current?.previous ?? null,
            results: [payload, ...deduped],
          }
        })

        void queryClient.invalidateQueries({ queryKey: queryKeys.balance })
        void queryClient.invalidateQueries({ queryKey: ['transactions'] })
        void queryClient.invalidateQueries({ queryKey: queryKeys.sessions })

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
      if (event.code !== 1000) {
        toast.error('Realtime updates disconnected', {
          description: getSocketCloseMessage(event.code, event.reason),
        })
      }
    }

    return () => {
      logger.info('Closing notifications websocket')
      socket.close()
    }
  }, [queryClient])
}
