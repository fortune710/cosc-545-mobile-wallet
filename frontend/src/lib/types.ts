export type TransactionType = "sent" | "received" | "fee"
export type TransactionStatus = "pending" | "completed" | "failed"

export type Transaction = {
  id: string
  dateTimeUtc: string
  type: TransactionType
  counterpartyDisplayName: string
  amount: number
  memo?: string
  status: TransactionStatus
}

export type Recipient = {
  id: string
  name: string
  handle: string
  avatarUrl?: string
  lastPaidAt?: string
}

export type Filters = {
  dateFrom: string
  dateTo: string
  types: TransactionType[]
  amountMin: string
  amountMax: string
}

export type NotificationType = "payment_received" | "payment_sent" | "system" | "security"

export type NotificationItem = {
  id: string
  type: NotificationType
  title: string
  description: string
  createdAt: string
  isRead?: boolean // This will be calculated on the client
  actionUrl?: string
}
