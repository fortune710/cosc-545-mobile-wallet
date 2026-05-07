import { Plus, Search, UserPlus } from "lucide-react"
import { useState } from "react"
import { useRecipients } from "@/hooks/use-recipients"
import { RecipientListItem } from "@/components/recipient-list-item"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Button } from "@/components/ui/button"
import { 
  Empty, 
  EmptyHeader, 
  EmptyTitle, 
  EmptyDescription, 
  EmptyMedia, 
  EmptyContent 
} from "@/components/ui/empty"

export function RecipientsPage() {
  const { recipients, isLoading } = useRecipients()
  const [searchQuery, setSearchQuery] = useState("")

  const filteredRecipients = recipients.filter(
    (r) =>
      r.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <main className="mx-auto w-full max-w-[920px] px-4 pt-8 pb-28 md:px-6 md:pt-10 md:pb-10">
      <div className="flex flex-col gap-6">
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

        {/* Search Bar */}
        <InputGroup className="h-14 overflow-hidden rounded-[22px] bg-zinc-100/80 backdrop-blur-sm transition-all focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/20 dark:bg-zinc-900/80 dark:focus-within:bg-zinc-900 border-none shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <InputGroupInput 
            placeholder="Search name or handle..." 
            className="text-[16px] placeholder:text-zinc-400 font-medium pl-4 h-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <InputGroupAddon>
            <Search className="text-zinc-400 size-5" strokeWidth={2.5} />
          </InputGroupAddon>
          <InputGroupAddon align="inline-end" className="text-[14px] text-zinc-400 font-medium pr-5">
            {filteredRecipients.length} results
          </InputGroupAddon>
        </InputGroup>

        {/* Recipients List */}
        <div className="flex flex-col gap-1">
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
            <Empty className="h-[400px]">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Search className="size-4" />
                </EmptyMedia>
                <EmptyTitle>
                  {searchQuery ? "No matching recipients" : "No recipients added yet"}
                </EmptyTitle>
                <EmptyDescription>
                  {searchQuery 
                    ? `We couldn't find anyone matching "${searchQuery}"`
                    : "Add people you send money to often for quicker access."}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                {searchQuery ? (
                  <Button variant="outline" className="rounded-full" onClick={() => setSearchQuery("")}>
                    Clear search
                  </Button>
                ) : (
                  <Button className="rounded-full gap-2" onClick={() => console.log("Add recipient")}>
                    <UserPlus className="size-4" />
                    Add Recipient
                  </Button>
                )}
              </EmptyContent>
            </Empty>
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
