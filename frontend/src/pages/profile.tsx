import { useMemo, useState, type ReactNode } from "react"
import { ChevronLeft, Pencil, X, Check } from "lucide-react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { useCurrentUser } from "@/hooks/use-current-user"
import { Card, CardContent } from "@/components/ui/card"
import { authService } from "@/services/auth-service"
import { queryKeys } from "@/lib/query-keys"
import { phoneNumberSchema } from "@/lib/schemas/auth"

function SectionCard({ children }: { children: ReactNode }) {
  return (
    <Card className="rounded-[28px] border border-zinc-200 bg-white px-6 shadow-[0_1px_0_rgba(0,0,0,0.03),0_18px_40px_rgba(15,23,42,0.03)]">
      <CardContent className="px-0 py-4">
        {children}
      </CardContent>
    </Card>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-6 py-4 first:pt-0 last:pb-0">
      <span className="text-[18px] font-medium tracking-[-0.02em] text-zinc-500">{label}</span>
      <span className="text-right text-[18px] font-semibold tracking-[-0.02em] text-zinc-900">{value || "—"}</span>
    </div>
  )
}

function EditableRow({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"]
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
      <span className="shrink-0 text-[18px] font-medium tracking-[-0.02em] text-zinc-500">{label}</span>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className="h-9 max-w-[200px] rounded-xl border-zinc-300 text-right text-[16px] font-semibold text-zinc-900 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
      />
    </div>
  )
}

export function ProfilePage() {
  const { user, loading } = useCurrentUser()
  const queryClient = useQueryClient()

  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [formError, setFormError] = useState("")

  const fullName = useMemo(() => {
    if (!user) return "User"
    return `${user.firstName} ${user.lastName}`.trim()
  }, [user])

  const initials = useMemo(() => {
    if (!user) return "U"
    const combined = `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.trim()
    return combined.length > 0 ? combined.toUpperCase() : "U"
  }, [user])

  function startEditing() {
    setFirstName(user?.firstName ?? "")
    setLastName(user?.lastName ?? "")
    setPhoneNumber(user?.phoneNumber ?? "")
    setFormError("")
    setIsEditing(true)
  }

  function cancelEditing() {
    setFormError("")
    setIsEditing(false)
  }

  async function saveProfile() {
    const phoneValidation = phoneNumberSchema.safeParse(phoneNumber)
    if (!phoneValidation.success) {
      setFormError(phoneValidation.error.issues[0]?.message ?? "Invalid phone number.")
      return
    }

    setIsSaving(true)
    setFormError("")
    try {
      await authService.updateProfile({
        firstName,
        lastName,
        phoneNumber: phoneValidation.data.replace(/[\s-]/g, "").replace(/^00/, "+"),
      })
      await queryClient.invalidateQueries({ queryKey: queryKeys.currentUser })
      toast.success("Profile updated.")
      setIsEditing(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update profile. Please try again."
      setFormError(message)
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="min-h-svh bg-[linear-gradient(180deg,#ffffff_0%,#fbfbfd_100%)] text-zinc-950">
      <div className="mx-auto flex min-h-svh w-full max-w-[920px] flex-col box-border px-4 pb-8 pt-6 sm:px-5 md:px-8">
        <header className="flex items-center justify-between">
          <Link
            to="/more"
            className="flex items-center gap-1 text-[13px] font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-white"
            aria-label="Back to More"
          >
            <ChevronLeft className="size-4" strokeWidth={2.2} />
            <span>More</span>
          </Link>
        </header>

        <section className="mt-10 flex items-center justify-between gap-4 md:mt-14">
          <div className="min-w-0 grid gap-1.5">
            {loading ? (
              <>
                <Skeleton className="h-12 w-[18rem] rounded-xl" />
                <Skeleton className="h-8 w-[14rem] rounded-xl" />
              </>
            ) : (
              <>
                <h1 className="truncate text-xl my-0! font-semibold leading-[0.96] tracking-[-0.05em] text-zinc-950 md:text-[58px]">
                  {fullName}
                </h1>
                <p className="truncate text-lg leading-tight tracking-[-0.03em] text-zinc-500">
                  {user?.email ?? "user@example.com"}
                </p>
              </>
            )}
          </div>

          {loading ? (
            <Skeleton className="size-[80px] rounded-full" />
          ) : (
            <Avatar className="size-[80px] shrink-0 bg-[#245fca] shadow-[0_14px_30px_rgba(36,95,202,0.22)]">
              <AvatarImage
                src={`https://api.dicebear.com/7.x/initials/svg?seed=${fullName}`}
                alt="Profile avatar"
              />
              <AvatarFallback className="bg-[#245fca] text-[30px] font-bold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
          )}
        </section>

        <div className="mt-8 md:mt-12 space-y-8">
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[18px] font-medium tracking-[0.24em] text-zinc-400">
                Personal Details
              </h2>
              {!loading && !isEditing && (
                <button
                  type="button"
                  onClick={startEditing}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium text-violet-600 transition hover:bg-violet-50"
                >
                  <Pencil className="size-3.5" />
                  Edit
                </button>
              )}
              {isEditing && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={cancelEditing}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium text-zinc-500 transition hover:bg-zinc-100"
                  >
                    <X className="size-3.5" />
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveProfile}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 rounded-full bg-violet-600 px-3 py-1.5 text-[13px] font-medium text-white transition hover:bg-violet-700 disabled:opacity-60"
                  >
                    <Check className="size-3.5" />
                    {isSaving ? "Saving…" : "Save"}
                  </button>
                </div>
              )}
            </div>

            <SectionCard>
              {loading ? (
                <div className="py-7">
                  <Skeleton className="h-8 w-full rounded-md" />
                  <Skeleton className="mt-7 h-8 w-full rounded-md" />
                  <Skeleton className="mt-7 h-8 w-full rounded-md" />
                </div>
              ) : isEditing ? (
                <>
                  <EditableRow label="First name" value={firstName} onChange={setFirstName} placeholder="First name" />
                  <EditableRow label="Last name" value={lastName} onChange={setLastName} placeholder="Last name" />
                  <EditableRow
                    label="Phone"
                    value={phoneNumber}
                    onChange={(value) => {
                      setPhoneNumber(value)
                      setFormError("")
                    }}
                    placeholder="+1 555 000 0000"
                    inputMode="tel"
                  />
                  <InfoRow label="Email" value={user?.email ?? "—"} />
                  {formError ? (
                    <div className="pt-4 text-right text-[13px] font-medium text-red-500">{formError}</div>
                  ) : null}
                </>
              ) : (
                <>
                  <InfoRow label="First name" value={user?.firstName || "—"} />
                  <InfoRow label="Last name" value={user?.lastName || "—"} />
                  <InfoRow label="Phone" value={user?.phoneNumber || "—"} />
                  <InfoRow label="Email" value={user?.email ?? "—"} />
                </>
              )}
            </SectionCard>
          </section>
        </div>
      </div>
    </main>
  )
}
