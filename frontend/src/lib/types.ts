import { z } from "zod"
import { signInSchema, signUpSchema } from "./schemas/auth"

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
  displayName: string
  email: string
  createdAt: string
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

export type SignInValues = z.infer<typeof signInSchema>
export type SignUpValues = z.infer<typeof signUpSchema>

export type TransferRecipient = {
  id: string
  name: string
  email: string
}

export type TransferStep = 1 | 2 | 3

export type FundingOption = {
  id: string
  label: string
  detail?: string
  speedLabel: "In seconds" | "In 3 to 5 days"
  icon: "card" | "bank" | "add-bank"
}

export type AuthUser = {
  firstName: string
  lastName: string
  email: string
}
