import { ArrowLeft, CheckCircle2, Bell } from "lucide-react"
import { Link } from "react-router-dom"
import { useEffect } from "react"

import { NotificationListItem } from "@/components/notification-list-item"
import { useNotifications } from "@/hooks/use-notifications"
import { Button } from "@/components/ui/button"

export function NotificationsPage() {
  const { notifications, isLoading, unreadCount, markAllAsRead } = useNotifications()

  // Mark all as read when component unmounts
  useEffect(() => {
    return () => {
      markAllAsRead()
    }
  }, [markAllAsRead])

  // Group notifications
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const todayNotifications = notifications.filter(
    (n) => new Date(n.createdAt) >= today
  )
  const earlierNotifications = notifications.filter(
    (n) => new Date(n.createdAt) < today
  )

  return (
    <main className="mx-auto w-full max-w-[920px] box-border px-4 pt-10 pb-28 sm:px-5 md:px-8 md:pt-12 md:pb-10">
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            to="/home"
            className="grid size-11 place-items-center rounded-full text-zinc-900 hover:bg-zinc-100 transition-colors"
            aria-label="Back to home"
          >
            <ArrowLeft className="size-7" />
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-[24px] font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <span className="flex items-center justify-center rounded-full bg-primary px-3 py-1 text-[13px] font-bold text-white shadow-sm">
                {unreadCount} new
              </span>
            )}
          </div>
        </div>

        {unreadCount > 0 && (
          <Button 
            variant="ghost" 
            className="text-primary font-semibold hover:bg-primary/10 gap-2 rounded-full hidden md:flex"
            onClick={() => markAllAsRead()}
          >
            <CheckCircle2 className="size-4" />
            Mark all read
          </Button>
        )}
      </header>

      {isLoading ? (
        <div className="flex flex-col gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 w-full animate-pulse rounded-[32px] bg-zinc-100 dark:bg-zinc-900" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <section className="mt-10 rounded-[32px] border border-dashed border-zinc-200 bg-zinc-50/50 p-12 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800/50">
            <Bell className="size-8 text-zinc-400" />
          </div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">You're all caught up</h2>
          <p className="mt-2 text-[15px] text-zinc-500">
            We'll notify you when there's activity on your account.
          </p>
        </section>
      ) : (
        <div className="flex flex-col gap-10">
          {todayNotifications.length > 0 && (
            <section>
              <h2 className="text-[15px] font-bold uppercase tracking-wider text-zinc-500 mb-4 px-2">
                Today
              </h2>
              <div className="flex flex-col gap-2">
                {todayNotifications.map((notification) => (
                  <NotificationListItem 
                    key={notification.id} 
                    notification={notification} 
                  />
                ))}
              </div>
            </section>
          )}

          {earlierNotifications.length > 0 && (
            <section>
              <h2 className="text-[20px] font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-4 px-2">
                Earlier
              </h2>
              <div className="flex flex-col gap-2">
                {earlierNotifications.map((notification) => (
                  <NotificationListItem 
                    key={notification.id} 
                    notification={notification} 
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  )
}
