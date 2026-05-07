import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  BadgeCheck,
  ChevronRight,
  Key,
  Lock,
  LogOut,
  ShieldCheck,
  UserCircle
} from "lucide-react"
import { X } from "lucide-react"
import { Link } from "react-router-dom"
import { useCurrentUser } from "@/hooks/use-current-user"
import { SignOutConfirmation } from "@/components/auth/sign-out-confirmation"

import { Skeleton } from "@/components/ui/skeleton"

export function MorePage() {
  const { user, loading } = useCurrentUser()
  const fullName = user ? `${user.firstName} ${user.lastName}` : "User"
  const initials = user ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : "U"

  return (
    <main className="mx-auto w-full max-w-[920px] pb-28 md:px-10 md:pt-12 md:pb-10 pt-4">
      <header className="relative px-4 sm:px-6 flex items-center justify-start pt-2">
        <h1 className="text-[17px] font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          More
        </h1>
        <Link to="/home" className="absolute right-4 grid size-8 place-items-center rounded-full bg-zinc-100 hover:bg-zinc-200 transition-colors text-zinc-500 dark:bg-zinc-800 dark:hover:bg-zinc-700">
          <X className="size-5" />
        </Link>
      </header>

      <div className="flex flex-col px-4 sm:px-6">

        {/* Profile Card */}
        <div className="group flex items-center gap-4 py-4 mb-4 active:scale-[0.98] transition-all cursor-pointer rounded-2xl px-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
          {loading ? (
            <Skeleton className="size-[60px] rounded-full" />
          ) : (
            <Avatar className="size-[60px] shadow-sm">
              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${fullName}`} alt="Profile avatar" />
              <AvatarFallback className="bg-primary/10 text-primary font-medium text-lg">
                {initials}
              </AvatarFallback>
            </Avatar>
          )}
          <div className="flex flex-col flex-1 gap-1">
            {loading ? (
              <>
                <Skeleton className="h-7 w-32 rounded-md" />
                <Skeleton className="h-5 w-24 rounded-md" />
              </>
            ) : (
              <>
                <span className="text-[20px] font-medium tracking-tight text-zinc-900 dark:text-zinc-50">
                  {fullName}
                </span>
                <span className="text-[15px] text-zinc-400 font-medium group-hover:text-zinc-500 transition-colors flex items-center gap-0.5">
                  Edit Profile <ChevronRight className="size-4" />
                </span>
              </>
            )}
          </div>
        </div>

        {/* Account Information */}
        <section className="mb-8">
          <h2 className="text-[13px] font-semibold text-zinc-400 mb-2 px-2 tracking-wide">
            Account Information
          </h2>
          <div className="bg-white dark:bg-zinc-900/50 rounded-none sm:rounded-2xl">
            <div className="flex items-center justify-between py-3 px-2 cursor-pointer transition-colors group">
              <div className="flex items-center gap-3.5">
                <UserCircle className="size-[22px] text-zinc-400" strokeWidth={1.5} />
                <span className="text-[17px] font-medium text-zinc-900 dark:text-zinc-100 group-active:text-zinc-500">Your Profile</span>
              </div>
              <ChevronRight className="size-[20px] text-zinc-300" strokeWidth={2} />
            </div>
            <div className="flex items-center justify-between py-3 px-2 cursor-pointer transition-colors group">
              <div className="flex items-center gap-3.5">
                <BadgeCheck className="size-[22px] text-zinc-400" strokeWidth={1.5} />
                <span className="text-[17px] font-medium text-zinc-900 dark:text-zinc-100 group-active:text-zinc-500">Account Verification</span>
              </div>
              <ChevronRight className="size-[20px] text-zinc-300" strokeWidth={2} />
            </div>
          </div>
        </section>

        {/* Account Security */}
        <section className="mb-8">
          <h2 className="text-[13px] font-semibold text-zinc-400 mb-2 px-2 tracking-wide">
            Account Security
          </h2>
          <div className="bg-white dark:bg-zinc-900/50 rounded-none sm:rounded-2xl">
            <div className="flex items-center justify-between py-3 px-2 cursor-pointer transition-colors group">
              <div className="flex items-center gap-3.5">
                <Key className="size-[22px] text-zinc-400" strokeWidth={1.5} />
                <span className="text-[17px] font-medium text-zinc-900 dark:text-zinc-100 group-active:text-zinc-500">Change Password</span>
              </div>
              <ChevronRight className="size-[20px] text-zinc-300" strokeWidth={2} />
            </div>
            <div className="flex items-center justify-between py-3 px-2 cursor-pointer transition-colors group">
              <div className="flex items-center gap-3.5">
                <ShieldCheck className="size-[22px] text-zinc-400" strokeWidth={1.5} />
                <span className="text-[17px] font-medium text-zinc-900 dark:text-zinc-100 group-active:text-zinc-500">Multi factor Authentication</span>
              </div>
              <ChevronRight className="size-[20px] text-zinc-300" strokeWidth={2} />
            </div>
            <div className="flex items-center justify-between py-3 px-2 cursor-pointer transition-colors group">
              <div className="flex items-center gap-3.5">
                <Lock className="size-[22px] text-zinc-400" strokeWidth={1.5} />
                <span className="text-[17px] font-medium text-zinc-900 dark:text-zinc-100 group-active:text-zinc-500">Change PIN</span>
              </div>
              <ChevronRight className="size-[20px] text-zinc-300" strokeWidth={2} />
            </div>
          </div>
        </section>

        <section className="mb-10">
          <div className="bg-white dark:bg-zinc-900/50 rounded-none sm:rounded-2xl">
            <SignOutConfirmation>
              <div className="flex items-center py-3 px-2 cursor-pointer group active:scale-[0.98] transition-transform">
                <div className="flex items-center gap-3.5">
                  <LogOut className="size-[22px] text-zinc-400 group-active:text-zinc-600" strokeWidth={1.5} />
                  <span className="text-[17px] font-medium text-zinc-900 dark:text-zinc-100 group-active:text-zinc-500">Sign Out</span>
                </div>
              </div>
            </SignOutConfirmation>
          </div>
        </section>

        <div className="text-center pb-8 flex flex-col items-center justify-center gap-2">
          {/* Pseudo-logo to match the Luma screenshot style */}
          <div className="flex items-center gap-1 mb-1 opacity-40 mix-blend-multiply dark:mix-blend-lighten grayscale">
            <span className="font-bold text-xl tracking-tighter text-zinc-500">wallet</span>
            <span className="text-[16px] text-zinc-400 leading-none mb-3">✦</span>
          </div>
          <p className="text-zinc-400 text-[13px] font-medium">Version 1.0.0 (1)</p>
        </div>

      </div>
    </main>
  )
}
