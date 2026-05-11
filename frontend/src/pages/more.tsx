import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  BadgeCheck,
  ChevronRight,
  Key,
  Lock,
  LogOut,
  Monitor,
  ShieldCheck,
  UserCircle,
} from "lucide-react"
import { Link } from "react-router-dom"
import { useCurrentUser } from "@/hooks/use-current-user"
import { SignOutConfirmation } from "@/components/auth/sign-out-confirmation"
import { Skeleton } from "@/components/ui/skeleton"
import { SettingsLayout } from "@/components/layout/settings-layout"

export function MorePage() {
  const { user, loading } = useCurrentUser()
  const fullName = user ? `${user.firstName} ${user.lastName}` : "User"
  const initials = user ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : "U"

  return (
    <SettingsLayout title="Settings" backTo="/home" backLabel="Home">
      {/* Profile Card */}
      <Link to="/profile" className="group flex items-center gap-4 py-4 mb-4 active:scale-[0.98] transition-all cursor-pointer rounded-2xl px-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
        {loading ? (
          <Skeleton className="size-15 rounded-full" />
        ) : (
          <Avatar className="size-15 shadow-sm">
            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${fullName}`} alt="Profile avatar" />
            <AvatarFallback className="bg-violet-100 text-violet-600 font-medium text-lg dark:bg-violet-900 dark:text-violet-300">
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
              <span className="text-[20px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                {fullName}
              </span>
              <span className="text-[14px] text-zinc-400 font-medium group-hover:text-zinc-500 transition-colors flex items-center gap-0.5">
                Edit Profile <ChevronRight className="size-4" />
              </span>
            </>
          )}
        </div>
      </Link>

      {/* Account Information */}
      <section className="mb-6">
        <h2 className="text-[12px] font-semibold text-zinc-400 mb-2 px-1 tracking-widest uppercase">
          Account
        </h2>
        <div className="overflow-hidden rounded-2xl border border-zinc-100 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <Link to="/profile" className="flex items-center justify-between py-3.5 px-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
            <div className="flex items-center gap-3.5">
              <UserCircle className="size-5 text-zinc-400" strokeWidth={1.5} />
              <span className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100">Your Profile</span>
            </div>
            <ChevronRight className="size-4.5 text-zinc-300 dark:text-zinc-600" strokeWidth={2} />
          </Link>
          <div className="h-px bg-zinc-100 dark:bg-zinc-800 mx-4" />
          <div className="flex items-center justify-between py-3.5 px-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
            <div className="flex items-center gap-3.5">
              <BadgeCheck className="size-5 text-zinc-400" strokeWidth={1.5} />
              <span className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100">Account Verification</span>
            </div>
            <ChevronRight className="size-4.5 text-zinc-300 dark:text-zinc-600" strokeWidth={2} />
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="mb-6">
        <h2 className="text-[12px] font-semibold text-zinc-400 mb-2 px-1 tracking-widest uppercase">
          Security
        </h2>
        <div className="overflow-hidden rounded-2xl border border-zinc-100 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <Link to="/change-password" className="flex items-center justify-between py-3.5 px-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
            <div className="flex items-center gap-3.5">
              <Key className="size-5 text-zinc-400" strokeWidth={1.5} />
              <span className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100">Change Password</span>
            </div>
            <ChevronRight className="size-4.5 text-zinc-300 dark:text-zinc-600" strokeWidth={2} />
          </Link>
          <div className="h-px bg-zinc-100 dark:bg-zinc-800 mx-4" />
          <Link to="/mfa" className="flex items-center justify-between py-3.5 px-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
            <div className="flex items-center gap-3.5">
              <ShieldCheck className="size-5 text-zinc-400" strokeWidth={1.5} />
              <span className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100">Two-Factor Authentication</span>
            </div>
            <ChevronRight className="size-4.5 text-zinc-300 dark:text-zinc-600" strokeWidth={2} />
          </Link>
          <div className="h-px bg-zinc-100 dark:bg-zinc-800 mx-4" />
          <Link to="/change-pin" className="flex items-center justify-between py-3.5 px-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
            <div className="flex items-center gap-3.5">
              <Lock className="size-5 text-zinc-400" strokeWidth={1.5} />
              <span className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100">Change PIN</span>
            </div>
            <ChevronRight className="size-4.5 text-zinc-300 dark:text-zinc-600" strokeWidth={2} />
          </Link>
          <div className="h-px bg-zinc-100 dark:bg-zinc-800 mx-4" />
          <Link to="/sessions" className="flex items-center justify-between py-3.5 px-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
            <div className="flex items-center gap-3.5">
              <Monitor className="size-5 text-zinc-400" strokeWidth={1.5} />
              <span className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100">Active Devices</span>
            </div>
            <ChevronRight className="size-4.5 text-zinc-300 dark:text-zinc-600" strokeWidth={2} />
          </Link>
        </div>
      </section>

      {/* Sign Out */}
      <section className="mb-8">
        <div className="overflow-hidden rounded-2xl border border-zinc-100 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <SignOutConfirmation>
            <div className="flex items-center py-3.5 px-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors active:scale-[0.98]">
              <div className="flex items-center gap-3.5">
                <LogOut className="size-5 text-red-400" strokeWidth={1.5} />
                <span className="text-[15px] font-medium text-red-500 dark:text-red-400">Sign Out</span>
              </div>
            </div>
          </SignOutConfirmation>
        </div>
      </section>

      <div className="pb-28 md:pb-4 text-center flex flex-col items-center gap-1.5 opacity-40">
        <p className="text-zinc-500 text-[12px] font-medium tracking-wider uppercase">SecureWallet</p>
        <p className="text-zinc-400 text-[12px]">Version 1.0.0</p>
      </div>
    </SettingsLayout>
  )
}
