import api from '@/lib/api'
import logger from '@/lib/logger'
import type { BalanceResponse, ApiTransaction, TransactionFilters, PaginatedResponse } from '@/lib/types'
import { authService } from '@/services/auth-service'

function normalizeTransactionResponse(
  data: PaginatedResponse<ApiTransaction> | ApiTransaction[],
): PaginatedResponse<ApiTransaction> {
  if (Array.isArray(data)) {
    return {
      count: data.length,
      next: null,
      previous: null,
      results: data,
    }
  }
  return data
}

export const transactionService = {
  async getBalance(): Promise<BalanceResponse> {
    logger.info('Fetching wallet balance')
    try {
      const response = await api.get('/api/wallet/balance/')
      return response.data
    } catch (error: any) {
      logger.error({ error }, 'Failed to fetch wallet balance')
      throw authService.handleApiError(error)
    }
  },

  async fundWallet(payload: {
    amount: string
    cardholder_name: string
    card_number: string
    expiry_month: string
    expiry_year: string
    cvv: string
  }): Promise<BalanceResponse> {
    logger.info({ amount: payload.amount }, 'Funding wallet')
    try {
      const response = await api.post('/api/wallet/fund/', payload)
      return response.data
    } catch (error: any) {
      logger.error({ error }, 'Failed to fund wallet')
      throw authService.handleApiError(error)
    }
  },

  async getTransactions(filters?: TransactionFilters): Promise<PaginatedResponse<ApiTransaction>> {
    logger.info({ filters }, 'Fetching transactions')
    try {
      const params: Record<string, string | number> = {}
      if (filters?.dateFrom) params.date_from = filters.dateFrom
      if (filters?.dateTo) params.date_to = filters.dateTo
      if (filters?.transactionType) params.transaction_type = filters.transactionType
      if (filters?.amountMin) params.amount_min = filters.amountMin
      if (filters?.amountMax) params.amount_max = filters.amountMax
      if (filters?.page) params.page = filters.page
      if (filters?.pageSize) params.page_size = filters.pageSize

      const response = await api.get('/api/transactions/', { params })
      return normalizeTransactionResponse(response.data)
    } catch (error: any) {
      logger.error({ error }, 'Failed to fetch transactions')
      throw authService.handleApiError(error)
    }
  },

  async createPaymentIntent(payload: {
    recipient: string
    amount: string
    memo?: string
    idempotencyKey: string
  }) {
    logger.info({ recipient: payload.recipient, amount: payload.amount }, 'Creating payment intent')
    try {
      const response = await api.post(
        '/api/payments/intents/',
        { recipient: payload.recipient, amount: payload.amount, memo: payload.memo },
        { headers: { 'X-Idempotency-Key': payload.idempotencyKey } },
      )
      return response.data
    } catch (error: any) {
      logger.error({ error }, 'Failed to create payment intent')
      throw authService.handleApiError(error)
    }
  },

  async confirmPaymentIntent(intentId: string) {
    logger.info({ intentId }, 'Confirming payment intent')
    try {
      const response = await api.post(`/api/payments/intents/${intentId}/confirm/`)
      return response.data
    } catch (error: any) {
      logger.error({ error }, 'Failed to confirm payment intent')
      throw authService.handleApiError(error)
    }
  },

  async createPaymentRequest(payload: { target_user: string; amount: string; memo?: string }) {
    logger.info({ target: payload.target_user, amount: payload.amount }, 'Creating payment request')
    try {
      const response = await api.post('/api/payment-requests/', payload)
      return response.data
    } catch (error: any) {
      logger.error({ error }, 'Failed to create payment request')
      throw authService.handleApiError(error)
    }
  },

}
