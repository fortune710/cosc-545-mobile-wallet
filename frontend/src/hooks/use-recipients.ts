import { useQuery } from "@tanstack/react-query"
import { recipientsService } from "@/services/recipients-service"
import type { Recipient, RecipientCandidate } from "@/lib/types"
import { queryKeys } from "@/lib/query-keys"

export function useRecipients(searchQuery = "") {
  const query = useQuery<{ results: Recipient[], count: number }, Error>({
    queryKey: queryKeys.recipients(1, searchQuery),
    queryFn: () => recipientsService.getRecipients(1, searchQuery),
    placeholderData: (previousData) => previousData,
  })

  return {
    recipients: query.data?.results ?? [],
    count: query.data?.count ?? 0,
    isLoading: query.isLoading,
    error: query.error,
    refreshRecipients: query.refetch
  }
}

export function useRecipientSearch(searchQuery = "") {
  const normalizedQuery = searchQuery.trim()
  const query = useQuery<RecipientCandidate[], Error>({
    queryKey: queryKeys.recipientSearch(normalizedQuery),
    queryFn: () => recipientsService.searchUsers(normalizedQuery),
    enabled: normalizedQuery.length >= 2,
    placeholderData: (previousData) => previousData,
  })

  return {
    results: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  }
}
