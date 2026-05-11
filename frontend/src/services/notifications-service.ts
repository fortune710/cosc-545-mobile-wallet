import logger from '@/lib/logger'
import api from '@/lib/api'
import { config } from '@/lib/app-config'
import type { ApiNotification, PaginatedResponse } from '@/lib/types'
import { authService } from '@/services/auth-service'

export const notificationsService = {
  /**
   * Fetches the current user's notifications from the backend.
   */
  async getNotifications(page = 1): Promise<PaginatedResponse<ApiNotification>> {
    logger.info({ page }, 'Fetching notifications')
    try {
      const response = await api.get('/api/notifications/', { params: { page, page_size: 50 } })
      return response.data
    } catch (error: any) {
      logger.error({ error }, 'Failed to fetch notifications')
      throw authService.handleApiError(error)
    }
  },

  /**
   * Builds the websocket URL for realtime notification delivery.
   */
  getNotificationSocketUrl(): string | null {
    const token = authService.getAccessToken()
    if (!token) return null
    return `${config.wsUrl}/ws/notifications/?token=${encodeURIComponent(token)}`
  },
}
