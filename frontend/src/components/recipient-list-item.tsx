import { ChevronRight } from "lucide-react"
import type { Recipient } from "@/lib/types"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface RecipientListItemProps {
  recipient: Recipient
  onClick?: () => void
}

export function RecipientListItem({ recipient, onClick }: RecipientListItemProps) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-4 rounded-[32px] border border-transparent p-3 transition-all hover:border-white/50 hover:bg-white/50 hover:shadow-sm active:scale-[0.98] dark:hover:border-white/10 dark:hover:bg-white/5"
    >
      <div className="relative">
        <div className="absolute -inset-0.5 rounded-full bg-gradient-to-tr from-primary/20 to-primary/5 opacity-0 transition-opacity group-hover:opacity-100" />
        <Avatar className="size-12 border-2 border-white shadow-sm dark:border-zinc-900">
          <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${recipient.displayName}`} alt={recipient.displayName} />
          <AvatarFallback className="bg-primary/10 text-primary font-medium">
            {recipient.displayName.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-white bg-green-500 shadow-sm dark:border-zinc-900" />
      </div>
      
      <div className="flex flex-1 flex-col items-start gap-0.5">
        <span className="text-[15px] font-semibold text-zinc-900 transition-colors group-hover:text-primary dark:text-zinc-50 dark:group-hover:text-primary">
          {recipient.displayName}
        </span>
        <span className="text-[13px] text-zinc-500 dark:text-zinc-400">
          {recipient.email}
        </span>
      </div>

      <div className="flex items-center gap-3 pr-1">
        <ChevronRight className="size-[20px] text-zinc-300 transition-colors group-hover:text-zinc-400 dark:text-zinc-600 dark:group-hover:text-zinc-500" strokeWidth={2} />
      </div>
    </button>
  )
}
