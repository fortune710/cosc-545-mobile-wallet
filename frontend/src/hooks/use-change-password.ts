import { useMutation } from "@tanstack/react-query"
import { AxiosError } from "axios"
import { toast } from "sonner"

import logger from "@/lib/logger"
import type { ChangePasswordValues } from "@/lib/types"
import { authService } from "@/services/auth-service"

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof AxiosError) {
    const detail = error.response?.data?.detail
    if (typeof detail === "string" && detail.length > 0) {
      return detail
    }
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallback
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: ChangePasswordValues) => authService.changePassword(data),
    onSuccess: () => {
      toast.success("Password changed successfully.")
    },
    onError: (error) => {
      logger.error({ error }, "Change password mutation failed")
      toast.error(getErrorMessage(error, "We could not update your password. Please try again."))
    },
  })
}
