import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom"
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

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
import { LoginPage } from "@/pages/login"
import { SignUpPage } from "@/pages/signup"
import { ChangePinPage } from "@/pages/change-pin"
import { SetPinPage } from "@/pages/set-pin"
import { ChangePasswordPage } from "@/pages/change-password"
import { ProfilePage } from "@/pages/profile"

const queryClient = new QueryClient()

function AppShell() {
  const { pathname } = useLocation()
  const hideTabBar = ["/login", "/signup", "/add-balance", "/send", "/receive", "/notifications", "/history", "/change-pin", "/change-password", "/profile", "/set-pin"].includes(pathname)

  return (
    <div className="min-h-svh bg-white text-zinc-950">
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/add-balance" element={<AddBalancePage />} />
        <Route path="/send" element={<SendPage />} />
        <Route path="/receive" element={<ReceivePage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/recipients" element={<RecipientsPage />} />
        <Route path="/more" element={<MorePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/change-pin" element={<ChangePinPage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />
        <Route path="/set-pin" element={<SetPinPage />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>

      {hideTabBar ? null : <TabBar />}
      <Toaster richColors closeButton />
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
