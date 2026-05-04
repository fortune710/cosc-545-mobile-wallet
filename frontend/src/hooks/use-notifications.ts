import { useState, useEffect, useCallback } from "react"
import { mockNotifications } from "@/lib/notifications"
import type { NotificationItem } from "@/lib/types"

const LAST_READ_KEY = "wallet_notifications_last_read"

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchNotifications = useCallback(() => {
    setIsLoading(true)
    
    // Simulate API fetch delay
    setTimeout(() => {
      const lastReadTimestamp = localStorage.getItem(LAST_READ_KEY)
      const lastReadTime = lastReadTimestamp ? new Date(lastReadTimestamp).getTime() : 0

      // Process notifications to determine read status
      let unread = 0
      const processedNotifications = mockNotifications.map((notification) => {
        const notifTime = new Date(notification.createdAt).getTime()
        const isRead = notifTime <= lastReadTime
        
        if (!isRead) {
          unread += 1
        }
        
        return {
          ...notification,
          isRead,
        }
      })

      // Sort by newest first
      const sorted = processedNotifications.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )

      setNotifications(sorted)
      setUnreadCount(unread)
      setIsLoading(false)
    }, 600)
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const markAllAsRead = useCallback(() => {
    const now = new Date().toISOString()
    localStorage.setItem(LAST_READ_KEY, now)
    
    setNotifications((current) => 
      current.map(n => ({ ...n, isRead: true }))
    )
    setUnreadCount(0)
  }, [])

  return { 
    notifications, 
    isLoading, 
    unreadCount,
    markAllAsRead,
    refresh: fetchNotifications
  }
}
