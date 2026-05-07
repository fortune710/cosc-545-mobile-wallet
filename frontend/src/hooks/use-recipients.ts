import { useQuery } from "@tanstack/react-query"
import { recipientsService } from "@/services/recipients-service"
import type { Recipient } from "@/lib/types"

export function useRecipients() {
  const query = useQuery<{ results: Recipient[], count: number }, Error>({
    queryKey: ['recipients'],
    queryFn: () => recipientsService.getRecipients(),
  })

  return {
    recipients: query.data?.results ?? [],
    count: query.data?.count ?? 0,
    isLoading: query.isLoading,
    error: query.error,
    refreshRecipients: query.refetch
  }
}
