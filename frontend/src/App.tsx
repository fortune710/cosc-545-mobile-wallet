import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom"

import { TabBar } from "@/components/tab-bar"
import { Toaster } from "@/components/ui/sonner"
import { AddBalancePage } from "@/pages/add-balance"
import { MorePage } from "@/pages/more"
import { RecipientsPage } from "@/pages/recipients"
import { NotificationsPage } from "@/pages/notifications"
import { HistoryPage } from "@/pages/history"
import { HomePage } from "@/pages/home"
import { ReceivePage } from "@/pages/receive"
import { SendPage } from "@/pages/send"
import { TransactionsPage } from "@/pages/transactions"

function AppShell() {
  const { pathname } = useLocation()
  const hideTabBar = ["/add-balance", "/send", "/receive", "/notifications", "/history"].includes(pathname)

  return (
    <div className="min-h-svh bg-white text-zinc-950">
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/add-balance" element={<AddBalancePage />} />
        <Route path="/send" element={<SendPage />} />
        <Route path="/receive" element={<ReceivePage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/recipients" element={<RecipientsPage />} />
        <Route path="/more" element={<MorePage />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>

      {hideTabBar ? null : <TabBar />}
      <Toaster richColors closeButton />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}