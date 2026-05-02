import { CreditCard, Heart, Home } from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"

const tabs = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/for-you", label: "For you", icon: Heart },
  { to: "/cards", label: "Cards", icon: CreditCard },
] as const

export function TabBar() {
  const { pathname } = useLocation()

  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-50">
      <div className="mx-auto w-9/10 box-border px-4 pb-[calc(env(safe-area-inset-bottom,0px)+28px)] sm:px-5 md:px-8">
        <div className="rounded-[56px] border border-white/40 dark:border-white/20 bg-white/30 dark:bg-black/30 px-2 py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.12)] backdrop-blur-2xl saturate-150">
          <div className="grid grid-cols-3 gap-1">
            {tabs.map((t) => {
              const Icon = t.icon
              const isActive =
                pathname === t.to || (t.to !== "/home" && pathname.startsWith(t.to))

              return (
                <NavLink
                  key={t.to}
                  to={t.to}
                  className={[
                    "group flex flex-col gap-1.5 items-center rounded-[38px] px-3 py-2.5 transition",
                    isActive
                      ? "bg-primary/20 text-primary dark:bg-primary/25"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white",
                  ].join(" ")}
                >
                  <Icon
                    className="size-[18px]"
                    aria-hidden="true"
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  <span
                    className={[
                      "text-[11px] leading-none tracking-[0.01em]",
                      isActive ? "font-medium" : "font-normal opacity-90",
                    ].join(" ")}
                  >
                    {t.label}
                  </span>
                </NavLink>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}
