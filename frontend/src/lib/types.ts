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

export type RecipientCandidate = {
  id: string
  displayName: string
  email: string
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
  userId?: string
  isRead?: boolean // This will be calculated on the client
  actionUrl?: string
}

export type ApiNotification = {
  id: string
  title: string
  body: string
  type: NotificationType
  user: string
  created_at: string
}

export type SignInValues = z.infer<typeof signInSchema>
export type SignUpValues = z.infer<typeof signUpSchema>
export type ChangePasswordValues = {
  currentPassword: string
  newPassword: string
}

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
  phoneNumber?: string
  emailVerified?: boolean
  mfaEnabled?: boolean
}

export type PinPresenceResponse = {
  has_pin: boolean
}

export type BalanceResponse = {
  balance: number
}

export type LoginStartResponse = {
  detail?: string
  flow_token?: string
  email?: string
  mfa_required?: boolean
  mfa_setup_required?: boolean
  provisioning_url?: string
  secret?: string
  email_verification_required?: boolean
}

export type LoginVerifyResponse = {
  access: string
  refresh: string
  user: {
    id?: string | number
    email?: string
  }
  recovery_codes?: string[]
}

export type SessionRefreshResponse = {
  access: string
  refresh: string
}

/** @deprecated use LoginStartResponse / LoginVerifyResponse */
export type LoginResponse = LoginVerifyResponse & {
  has_pin?: boolean
  mfa_required?: boolean
}

export interface SignOutConfirmationProps {
  children: React.ReactNode
}

export type ApiTransaction = {
  id: string
  date_time_utc: string
  type: 'funding' | 'payment_sent' | 'payment_received' | 'request_payment'
  counterparty_display_name: string
  amount: string
  memo?: string
  status: 'pending' | 'completed' | 'declined' | 'expired' | 'failed'
}

export type SessionRecord = {
  session_key: string
  device_id: string
  ip_address: string | null
  user_agent: string
  created_at: string
  expires_at: string
  is_active: boolean
}

export type TransactionFilters = {
  dateFrom?: string
  dateTo?: string
  transactionType?: string
  amountMin?: string
  amountMax?: string
  page?: number
  pageSize?: number
}

export type PaginatedResponse<T> = {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}
