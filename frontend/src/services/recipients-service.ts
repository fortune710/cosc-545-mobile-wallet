import api from '@/lib/api'
import logger from '@/lib/logger'
import type { Recipient, RecipientCandidate } from '@/lib/types'

function mapRecipient(r: any): Recipient {
  return {
    id: String(r.id),
    displayName: r.display_name || r.email,
    email: r.email,
    createdAt: r.created_at,
  }
}

export const recipientsService = {
  async getRecipients(page = 1, query = ''): Promise<{ results: Recipient[], count: number }> {
    logger.info({ page, query }, 'Fetching recipients')
    try {
      const response = await api.get('/api/recipients/', {
        params: { page, q: query || undefined }
      })

      return {
        ...response.data,
        results: response.data.results.map(mapRecipient)
      }
    } catch (error: any) {
      logger.error({ error }, 'Failed to fetch recipients')
      throw error
    }
  },

  async searchUsers(query: string): Promise<RecipientCandidate[]> {
    logger.info({ query }, 'Searching internal users for recipients')
    try {
      const response = await api.get('/api/recipients/search-users/', {
        params: { q: query },
      })
      return response.data.map((user: any) => ({
        id: String(user.id),
        displayName: user.display_name || user.email,
        email: user.email,
      }))
    } catch (error: any) {
      logger.error({ query, error }, 'Failed to search recipient users')
      throw error
    }
  },

  async addRecipient(recipientIdentifier: string): Promise<Recipient> {
    logger.info({ recipientIdentifier }, 'Adding recipient')
    try {
      const response = await api.post('/api/recipients/', {
        recipient: recipientIdentifier
      })
      return mapRecipient(response.data)
    } catch (error: any) {
      logger.error({ recipientIdentifier, error }, 'Failed to add recipient')
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
