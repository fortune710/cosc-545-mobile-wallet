import { Plus, Search, UserPlus, X } from "lucide-react"
import { useDeferredValue, useState } from "react"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"
import { useRecipientSearch, useRecipients } from "@/hooks/use-recipients"
import { RecipientListItem } from "@/components/recipient-list-item"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
  EmptyContent
} from "@/components/ui/empty"
import { recipientsService } from "@/services/recipients-service"
import { PageShell } from "@/components/layout/page-shell"

export function RecipientsPage() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddForm, setShowAddForm] = useState(false)
  const [newEmail, setNewEmail] = useState("")
  const [selectedCandidateId, setSelectedCandidateId] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const deferredSearchQuery = useDeferredValue(searchQuery.trim())
  const deferredNewEmail = useDeferredValue(newEmail.trim())
  const { recipients, count, isLoading } = useRecipients(deferredSearchQuery)
  const { results: candidateResults, isLoading: isSearchingCandidates } = useRecipientSearch(deferredNewEmail)

  const candidateExactMatch = candidateResults.find(
    (candidate) => candidate.email.toLowerCase() === newEmail.trim().toLowerCase(),
  )

  const selectedCandidate =
    candidateResults.find((candidate) => candidate.id === selectedCandidateId) ?? null
  const showCandidateNotFound =
    deferredNewEmail.includes("@") &&
    deferredNewEmail.length >= 3 &&
    !isSearchingCandidates &&
    !candidateExactMatch

  const handleAddRecipient = async (recipientIdentifier?: string) => {
    const resolvedIdentifier = recipientIdentifier ?? selectedCandidate?.id ?? ""
    if (!resolvedIdentifier) return
    setIsAdding(true)
    try {
      await recipientsService.addRecipient(resolvedIdentifier)
      queryClient.invalidateQueries({ queryKey: ["recipients"] })
      toast.success("Recipient added.")
      setNewEmail("")
      setSelectedCandidateId("")
      setShowAddForm(false)
    } catch (error: any) {
      const msg = error?.response?.data?.detail || error?.response?.data?.recipient?.[0] || "Could not add recipient."
      toast.error(msg)
    } finally {
      setIsAdding(false)
    }
  }

  const openAddForm = () => setShowAddForm(true)

  return (
    <PageShell maxWidth="max-w-230" className="md:px-6">
      <div className="flex flex-col gap-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-[32px] font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
              Recipients
            </h1>
            <p className="text-[15px] text-zinc-500">
              {count} {count === 1 ? "person" : "people"} saved
            </p>
          </div>

          {/* Desktop Add Button */}
          <Button
            className="hidden h-12 gap-2 rounded-full px-6 text-[15px] font-semibold transition-all hover:scale-105 active:scale-95 md:flex"
            onClick={openAddForm}
          >
            <UserPlus className="size-4" />
            Add Recipient
          </Button>
        </div>

        {/* Add recipient form */}
        {showAddForm && (
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900">
            <div className="flex items-center gap-2">
              <Input
                type="email"
                placeholder="Search by name or email"
                value={newEmail}
                onChange={(e) => {
                  setNewEmail(e.target.value)
                  setSelectedCandidateId("")
                }}
                onKeyDown={(e) => e.key === "Enter" && handleAddRecipient()}
                className="h-10 flex-1 rounded-xl border-zinc-200 bg-white text-sm dark:border-zinc-700 dark:bg-zinc-800"
                autoFocus
              />
              <Button
                onClick={() => handleAddRecipient()}
                disabled={isAdding || !selectedCandidate}
                className="h-10 rounded-xl px-4 text-sm"
              >
                {isAdding ? "Adding..." : "Add"}
              </Button>
              <button
                type="button"
                onClick={() => { setShowAddForm(false); setNewEmail(""); setSelectedCandidateId("") }}
                className="grid size-10 place-items-center rounded-xl text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              >
                <X className="size-4" />
              </button>
            </div>

            {selectedCandidate && (
              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-emerald-700 dark:text-emerald-300">
                  Selected account
                </p>
                <p className="mt-1 text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                  {selectedCandidate.displayName}
                </p>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">{selectedCandidate.email}</p>
              </div>
            )}

            {deferredNewEmail.length >= 2 && (
              <div className="mt-3 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950">
                {isSearchingCandidates ? (
                  <div className="px-4 py-3 text-sm text-zinc-500">Searching…</div>
                ) : candidateResults.length > 0 ? (
                  candidateResults.map((candidate) => (
                    <button
                      key={candidate.id}
                      type="button"
                      onClick={() => {
                        setSelectedCandidateId(candidate.id)
                        setNewEmail(candidate.email)
                      }}
                      className={`flex w-full items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3 text-left last:border-b-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 ${
                        selectedCandidateId === candidate.id ? "bg-emerald-50 dark:bg-emerald-950/20" : ""
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {candidate.displayName}
                        </p>
                        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                          {candidate.email}
                        </p>
                      </div>
                      <span className="text-xs font-medium text-primary">
                        {selectedCandidateId === candidate.id ? "Selected" : "Select"}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm text-zinc-500">No matching users found.</div>
                )}
              </div>
            )}

            {showCandidateNotFound && (
              <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
                No account found with this email address.
              </p>
            )}
          </div>
        )}


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
            {count} results
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
          ) : recipients.length > 0 ? (
            recipients.map((recipient) => (
              <RecipientListItem
                key={recipient.id}
                recipient={recipient}
                onClick={() => {}}
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
                  <Button className="rounded-full gap-2" onClick={openAddForm}>
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
          onClick={openAddForm}
        >
          <Plus className="size-6" strokeWidth={3} />
        </button>
      </div>
    </PageShell>
  )
}
