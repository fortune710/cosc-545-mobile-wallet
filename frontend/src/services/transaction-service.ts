import api from "@/lib/api"
import logger from "@/lib/logger"
import type { BalanceResponse } from "@/lib/types"
import { authService } from "@/services/auth-service"

export const transactionService = {
  async getBalance(): Promise<BalanceResponse> {
    logger.info("Fetching wallet balance")
    try {
      const response = await api.get("/api/auth/balance/")
      return response.data
    } catch (error: any) {
      logger.error({ error }, "Failed to fetch wallet balance")
      throw authService.handleApiError(error)
    }
  },
}
