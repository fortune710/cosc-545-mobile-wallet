import api from '@/lib/api'
import logger from '@/lib/logger'
import type { Recipient } from '@/lib/types'

export const recipientsService = {
  async getRecipients(page = 1): Promise<{ results: Recipient[], count: number }> {
    logger.info({ page }, 'Fetching recipients')
    try {
      const response = await api.get('/api/recipients/', {
        params: { page }
      })
      
      const mappedResults = response.data.results.map((r: any) => ({
        id: String(r.id),
        displayName: r.display_name,
        email: r.email,
        createdAt: r.created_at,
      }))
      
      return {
        ...response.data,
        results: mappedResults
      }
    } catch (error: any) {
      logger.error({ error }, 'Failed to fetch recipients')
      throw error
    }
  },

  async addRecipient(recipientId: string): Promise<Recipient> {
    logger.info({ recipientId }, 'Adding recipient')
    try {
      const response = await api.post('/api/recipients/', {
        recipient: recipientId
      })
      
      const r = response.data
      return {
        id: String(r.id),
        displayName: r.display_name,
        email: r.email,
        createdAt: r.created_at,
      }
    } catch (error: any) {
      logger.error({ recipientId, error }, 'Failed to add recipient')
      throw error
    }
  },

  async deleteRecipient(id: string): Promise<void> {
    logger.info({ id }, 'Deleting recipient')
    try {
      await api.delete(`/api/recipients/${id}/`)
    } catch (error: any) {
      logger.error({ id, error }, 'Failed to delete recipient')
      throw error
    }
  }
}
