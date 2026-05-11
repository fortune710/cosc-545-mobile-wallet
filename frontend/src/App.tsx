import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom"
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { TabBar } from "@/components/tab-bar"
import { ProtectedRoute } from "@/components/auth/protected-route"
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
import { MfaPage } from "@/pages/mfa"
import { VerifyEmailPage } from "@/pages/verify-email"
import { SessionsPage } from "@/pages/sessions"

const queryClient = new QueryClient()

function AppShell() {
  const { pathname } = useLocation()
  const hideTabBar = ["/login", "/signup", "/verify-email", "/add-balance", "/send", "/receive", "/notifications", "/history", "/change-pin", "/change-password", "/profile", "/set-pin", "/mfa", "/sessions"].includes(pathname)

  return (
    <div className="min-h-svh bg-white text-zinc-950">
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route
          path="/home"
          element={(
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/add-balance"
          element={(
            <ProtectedRoute>
              <AddBalancePage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/send"
          element={(
            <ProtectedRoute>
              <SendPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/receive"
          element={(
            <ProtectedRoute>
              <ReceivePage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/history"
          element={(
            <ProtectedRoute>
              <HistoryPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/transactions"
          element={(
            <ProtectedRoute>
              <TransactionsPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/notifications"
          element={(
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/recipients"
          element={(
            <ProtectedRoute>
              <RecipientsPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/more"
          element={(
            <ProtectedRoute>
              <MorePage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/profile"
          element={(
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/change-pin"
          element={(
            <ProtectedRoute>
              <ChangePinPage />
            </ProtectedRoute>
          )}
        />
        <Route path="/change-password"
          element={(
            <ProtectedRoute>
              <ChangePasswordPage />
            </ProtectedRoute>
          )}
        />
        <Route path="/set-pin"
          element={(
            <ProtectedRoute>
              <SetPinPage />
            </ProtectedRoute>
          )}
        />
        <Route path="/mfa" element={<MfaPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route
          path="/sessions"
          element={(
            <ProtectedRoute>
              <SessionsPage />
            </ProtectedRoute>
          )}
        />
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
