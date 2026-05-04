import { ArrowDownLeft, ArrowUpRight, Bell, ShieldCheck } from "lucide-react"
import { Link } from "react-router-dom"
import type { NotificationItem } from "@/lib/types"

interface NotificationListItemProps {
  notification: NotificationItem
}

function getIconForType(type: NotificationItem["type"]) {
  switch (type) {
    case "payment_received":
      return (
        <div className="flex size-12 items-center justify-center rounded-full bg-lime-100 text-lime-700 dark:bg-lime-500/20 dark:text-lime-400">
          <ArrowDownLeft className="size-5" />
        </div>
      )
    case "payment_sent":
      return (
        <div className="flex size-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          <ArrowUpRight className="size-5" />
        </div>
      )
    case "security":
      return (
        <div className="flex size-12 items-center justify-center rounded-full bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400">
          <ShieldCheck className="size-5" />
        </div>
      )
    case "system":
    default:
      return (
        <div className="flex size-12 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400">
          <Bell className="size-5" />
        </div>
      )
  }
}

function formatTimeRelative(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) return "Just now"
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours}h ago`
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) return `${diffInDays}d ago`
  
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export function NotificationListItem({ notification }: NotificationListItemProps) {
  const content = (
    <div className={`group relative flex w-full items-start gap-4 rounded-[32px] p-4 transition-all hover:bg-zinc-50 dark:hover:bg-zinc-900 ${!notification.isRead ? "bg-primary/5 dark:bg-primary/10" : ""}`}>
      
      {/* Unread Indicator */}
      {!notification.isRead && (
        <div className="absolute top-6 left-1.5 size-2 rounded-full bg-primary shadow-sm shadow-primary/40" />
      )}

      {/* Icon */}
      <div className="relative shrink-0">
        {getIconForType(notification.type)}
        {!notification.isRead && (
           <div className="absolute -inset-1 rounded-full bg-primary/20 blur-sm opacity-50" />
        )}
      </div>
      
      {/* Content */}
      <div className="flex flex-1 flex-col gap-1 pr-2">
        <div className="flex items-start justify-between gap-2">
          <span className={`text-[17px] font-semibold tracking-tight ${!notification.isRead ? "text-zinc-950 dark:text-zinc-50" : "text-zinc-800 dark:text-zinc-200"}`}>
            {notification.title}
          </span>
          <span className="shrink-0 text-[14px] font-medium text-zinc-500">
            {formatTimeRelative(notification.createdAt)}
          </span>
        </div>
        
        <p className={`text-[14px] leading-relaxed ${!notification.isRead ? "text-zinc-700 dark:text-zinc-300 font-medium" : "text-zinc-500 dark:text-zinc-400"}`}>
          {notification.description}
        </p>
      </div>
    </div>
  )

  if (notification.actionUrl) {
    return (
      <Link to={notification.actionUrl} className="block active:scale-[0.98] transition-transform">
        {content}
      </Link>
    )
  }

  return (
    <button 
      type="button" 
      className="w-full text-left active:scale-[0.98] transition-transform"
      onClick={() => console.log("Clicked notification", notification.id)}
    >
      {content}
    </button>
  )
}
