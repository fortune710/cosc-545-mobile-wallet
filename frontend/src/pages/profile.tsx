import { useMemo, type ReactNode } from "react"
import { ChevronLeft } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { useCurrentUser } from "@/hooks/use-current-user"
import { Card, CardContent } from "@/components/ui/card"

function InfoRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-4 first:pt-0 last:pb-0">
      <span className="text-[18px] font-medium tracking-[-0.02em] text-zinc-500">
        {label}
      </span>
      <span className="text-right text-[18px] font-semibold tracking-[-0.02em] text-zinc-900">
        {value}
      </span>
    </div>
  )
}

function SectionCard({ children }: { children: ReactNode }) {
  return (
    <Card className="rounded-[28px] border border-zinc-200 bg-white px-6 shadow-[0_1px_0_rgba(0,0,0,0.03),0_18px_40px_rgba(15,23,42,0.03)]">
      <CardContent className="px-0 py-4">
        {children}
      </CardContent>
    </Card>
  )
}

export function ProfilePage() {
  const navigate = useNavigate()
  const { user, loading } = useCurrentUser()

  const fullName = useMemo(() => {
    if (!user) return "User"
    return `${user.firstName} ${user.lastName}`.trim()
  }, [user])

  const initials = useMemo(() => {
    if (!user) return "U"

    const firstInitial = user.firstName?.[0] ?? ""
    const lastInitial = user.lastName?.[0] ?? ""
    const combined = `${firstInitial}${lastInitial}`.trim()
    return combined.length > 0 ? combined.toUpperCase() : "U"
  }, [user])

  return (
    <main className="min-h-svh bg-[linear-gradient(180deg,#ffffff_0%,#fbfbfd_100%)] text-zinc-950">
      <div className="mx-auto flex min-h-svh w-full max-w-[920px] flex-col box-border px-4 pb-8 pt-6 sm:px-5 md:px-8">
        <header className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate("/more", { replace: true })}
            className="grid size-14 place-items-center rounded-full border border-white/70 bg-white/90 text-slate-950 shadow-[0_18px_36px_rgba(15,23,42,0.08)] backdrop-blur transition-transform hover:scale-[0.98] active:scale-[0.97]"
            aria-label="Go back"
          >
            <ChevronLeft className="size-8" strokeWidth={1.8} />
          </button>
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
            <h2 className="mb-4 text-[18px] font-medium tracking-[0.24em] text-zinc-400">
              Personal Details
            </h2>
            <SectionCard>
              {loading ? (
                <div className="py-7">
                  <Skeleton className="h-8 w-full rounded-md" />
                  <Skeleton className="mt-7 h-8 w-full rounded-md" />
                  <Skeleton className="mt-7 h-8 w-full rounded-md" />
                  <Skeleton className="mt-7 h-8 w-full rounded-md" />
                  <Skeleton className="mt-7 h-8 w-full rounded-md" />
                </div>
              ) : (
                <>
                  <InfoRow label="First name" value={user?.firstName || "-"} />
                  <InfoRow label="Last name" value={user?.lastName || "-"} />
                  <InfoRow label="Phone Number" value="-" />
                  <InfoRow label="Date of birth" value="-" />
                </>
              )}
            </SectionCard>
          </section>
        </div>
      </div>
    </main>
  )
}
