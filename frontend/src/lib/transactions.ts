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

export const mockTransactions: Transaction[] = [
  {
    id: "tx-1001",
    dateTimeUtc: "2026-05-02T20:25:00Z",
    type: "sent",
    counterpartyDisplayName: "Mercadona Barcelona ES",
    amount: -8.82,
    memo: "Grocery purchase",
    status: "completed",
  },
  {
    id: "tx-1002",
    dateTimeUtc: "2026-05-02T15:07:00Z",
    type: "sent",
    counterpartyDisplayName: "Aromme Barcelona ES",
    amount: -4,
    memo: "Coffee purchase",
    status: "completed",
  },
  {
    id: "tx-1003",
    dateTimeUtc: "2026-05-01T11:43:00Z",
    type: "received",
    counterpartyDisplayName: "Jordan Miles",
    amount: 220,
    memo: "Shared rent reimbursement",
    status: "completed",
  },
  {
    id: "tx-1004",
    dateTimeUtc: "2026-05-01T09:31:00Z",
    type: "fee",
    counterpartyDisplayName: "Plazo",
    amount: -1.5,
    memo: "Transfer processing fee",
    status: "completed",
  },
  {
    id: "tx-1005",
    dateTimeUtc: "2026-04-29T18:10:00Z",
    type: "received",
    counterpartyDisplayName: "Luna Carter",
    amount: 78.25,
    memo: "Dinner split",
    status: "completed",
  },
  {
    id: "tx-1006",
    dateTimeUtc: "2026-04-28T08:16:00Z",
    type: "sent",
    counterpartyDisplayName: "Barcelona Metro",
    amount: -18,
    memo: "Monthly pass top-up",
    status: "completed",
  },
]
