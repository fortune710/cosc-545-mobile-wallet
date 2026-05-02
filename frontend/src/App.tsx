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
import { CardsPage } from "@/pages/cards"
import { ForYouPage } from "@/pages/for-you"
import { HistoryPage } from "@/pages/history"
import { HomePage } from "@/pages/home"
import { ReceivePage } from "@/pages/receive"
import { SendPage } from "@/pages/send"

function AppShell() {
  const { pathname } = useLocation()
  const hideTabBar = ["/add-balance", "/send", "/receive"].includes(pathname)

  return (
    <div className="min-h-svh bg-white text-zinc-950">
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/add-balance" element={<AddBalancePage />} />
        <Route path="/send" element={<SendPage />} />
        <Route path="/receive" element={<ReceivePage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/for-you" element={<ForYouPage />} />
        <Route path="/cards" element={<CardsPage />} />
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
