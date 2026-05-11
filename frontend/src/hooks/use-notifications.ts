import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { transactionService } from '@/services/transaction-service'
import { queryKeys } from '@/lib/query-keys'
import type { NotificationItem } from '@/lib/types'
import { authService } from '@/services/auth-service'

const LAST_READ_KEY = 'wallet_notifications_last_read'

function mapNotification(raw: any, lastReadTime: number): NotificationItem {
  const notifTime = new Date(raw.created_at).getTime()
  return {
    id: String(raw.id),
    type: raw.type as NotificationItem['type'],
    title: raw.title,
    description: raw.body,
    createdAt: raw.created_at,
    isRead: notifTime <= lastReadTime,
  }
}

export function useNotifications() {
  const queryClient = useQueryClient()
  const lastReadTimestamp = localStorage.getItem(LAST_READ_KEY)
  const lastReadTime = lastReadTimestamp ? new Date(lastReadTimestamp).getTime() : 0

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.notifications(),
    queryFn: () => transactionService.getNotifications(),
    enabled: authService.isAuthenticated(),
    select: (raw) => {
      const items: NotificationItem[] = (raw.results ?? [])
        .map((n: any) => mapNotification(n, lastReadTime))
        .sort((a: NotificationItem, b: NotificationItem) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      return items
    },
  })

  const notifications = data ?? []
  const unreadCount = notifications.filter((n) => !n.isRead).length

  const markAllAsRead = useCallback(() => {
    const now = new Date().toISOString()
    localStorage.setItem(LAST_READ_KEY, now)
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications() })
  }, [queryClient])

  return { notifications, isLoading, unreadCount, markAllAsRead, refresh: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications() }) }
}
