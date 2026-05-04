import { Plus, Search, UserPlus } from "lucide-react"
import { useState } from "react"
import { useRecipients } from "@/hooks/use-recipients"
import { RecipientListItem } from "@/components/recipient-list-item"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export function RecipientsPage() {
  const { recipients, isLoading } = useRecipients()
  const [searchQuery, setSearchQuery] = useState("")

  const filteredRecipients = recipients.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.handle.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <main className="mx-auto w-full max-w-[920px] px-6 pt-10 pb-28 md:px-10 md:pt-12 md:pb-10">
      <div className="flex flex-col gap-10">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-[32px] font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
              Recipients
            </h1>
            <p className="text-[15px] text-zinc-500">
              {recipients.length} people added
            </p>
          </div>
          
          {/* Desktop Add Button */}
          <Button 
            className="hidden h-12 gap-2 rounded-full px-6 text-[15px] font-semibold transition-all hover:scale-105 active:scale-95 md:flex"
            onClick={() => console.log("Add recipient")}
          >
            <UserPlus className="size-4" />
            Add Recipient
          </Button>
        </div>

        {/* Search Bar with Liquid Glass Effect */}
        <div className="relative group">
          <div className="absolute -inset-1 rounded-[22px] bg-gradient-to-r from-primary/20 via-primary/5 to-primary/20 opacity-0 blur-xl transition-opacity group-focus-within:opacity-100" />
          <div className="relative flex items-center">
            <Search className="absolute left-4 size-4 text-zinc-400" />
            <Input
              placeholder="Search name or handle..."
              className="h-14 rounded-2xl border-none bg-zinc-100/80 pl-11 text-[16px] backdrop-blur-sm transition-all focus-visible:bg-white focus-visible:ring-primary/20 dark:bg-zinc-900/80 dark:focus-visible:bg-zinc-900"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Recipients List */}
        <div className="flex flex-col gap-2">
          {isLoading ? (
            <div className="flex flex-col gap-4 py-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 w-full animate-pulse rounded-[32px] bg-zinc-100 dark:bg-zinc-900" />
              ))}
            </div>
          ) : filteredRecipients.length > 0 ? (
            filteredRecipients.map((recipient) => (
              <RecipientListItem 
                key={recipient.id} 
                recipient={recipient}
                onClick={() => console.log("Recipient clicked:", recipient.id)} 
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="group relative mb-6">
                <div className="absolute -inset-4 animate-pulse rounded-full bg-primary/10 blur-2xl" />
                <div className="relative flex size-20 items-center justify-center rounded-full bg-zinc-50 border border-white text-zinc-300 shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
                  <Search className="size-10 transition-transform group-hover:scale-110" />
                </div>
              </div>
              <h3 className="text-[19px] font-bold text-zinc-900 dark:text-zinc-50">Empty search results</h3>
              <p className="mt-2 max-w-[280px] text-[15px] leading-relaxed text-zinc-500">
                We couldn't find any recipients matching <span className="font-semibold text-zinc-900 dark:text-zinc-200">"{searchQuery}"</span>.
              </p>
              <Button 
                variant="outline" 
                className="mt-8 rounded-full border-zinc-200 px-6 py-5 dark:border-zinc-800"
                onClick={() => setSearchQuery("")}
              >
                Clear search
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Floating Action Button with Premium Glow */}
      <div className="fixed right-6 bottom-28 md:hidden">
        <div className="absolute -inset-1 animate-pulse rounded-full bg-primary blur-lg opacity-25" />
        <button
          className="relative flex size-14 items-center justify-center rounded-full bg-primary text-white shadow-xl transition-all hover:scale-110 active:scale-90"
          onClick={() => console.log("Add recipient mobile")}
        >
          <Plus className="size-6" strokeWidth={3} />
        </button>
      </div>
    </main>
  )
}
