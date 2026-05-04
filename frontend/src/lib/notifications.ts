import type { NotificationItem } from "@/lib/types"

export const mockNotifications: NotificationItem[] = [
  {
    id: "n1",
    type: "payment_received",
    title: "Payment Received",
    description: "Jordan Miles sent you $220 for Shared rent reimbursement.",
    createdAt: "2026-05-01T11:43:00Z",
    actionUrl: "/transactions/tx-1003",
  },
  {
    id: "n2",
    type: "system",
    title: "Account Verfied",
    description: "Your identity has been successfully verified. Your account limit has been increased.",
    createdAt: "2026-04-30T09:12:00Z",
  },
  {
    id: "n3",
    type: "payment_received",
    title: "Payment Received",
    description: "Luna Carter sent you $78.25 for Dinner split.",
    createdAt: "2026-04-29T18:10:00Z",
    actionUrl: "/transactions/tx-1005",
  },
  {
    id: "n4",
    type: "payment_sent",
    title: "Payment Sent",
    description: "You successfully sent $18 to Barcelona Metro.",
    createdAt: "2026-04-28T08:16:00Z",
    actionUrl: "/transactions/tx-1006",
  },
  {
    id: "n5",
    type: "security",
    title: "New Login Detected",
    description: "We noticed a new login from a device in Barcelona, ES. If this was you, no action is needed.",
    createdAt: "2026-04-26T14:30:00Z",
  },
]
