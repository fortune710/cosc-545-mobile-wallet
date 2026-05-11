import type { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

type SettingsLayoutProps = {
  children: ReactNode
  title: string
  backTo?: string
  backLabel?: string
  onBack?: () => void
  action?: ReactNode
  className?: string
}

export function SettingsLayout({
  children,
  title,
  backTo = '/more',
  backLabel = 'Settings',
  onBack,
  action,
  className,
}: SettingsLayoutProps) {
  const backEl = onBack ? (
    <button
      type="button"
      onClick={onBack}
      className="flex items-center gap-1 text-[13px] font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-white"
      aria-label={backLabel ? `Back to ${backLabel}` : 'Go back'}
    >
      <ChevronLeft className="size-4" strokeWidth={2.2} />
      {backLabel && <span>{backLabel}</span>}
    </button>
  ) : (
    <Link
      to={backTo}
      className="flex items-center gap-1 text-[13px] font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-white"
      aria-label={backLabel ? `Back to ${backLabel}` : 'Go back'}
    >
      <ChevronLeft className="size-4" strokeWidth={2.2} />
      {backLabel && <span>{backLabel}</span>}
    </Link>
  )

  return (
    <main className={cn('min-h-svh bg-white dark:bg-zinc-950', className)}>
      <div className="mx-auto flex min-h-svh w-full max-w-lg flex-col box-border px-4 pb-10 pt-6 sm:px-6">
        {/* Header */}
        <header className="relative flex items-center justify-between">
          {backEl}
          <h1 className="absolute left-1/2 -translate-x-1/2 text-[15px] font-semibold tracking-tight text-zinc-900 dark:text-white">
            {title}
          </h1>
          <div className="flex items-center">
            {action ?? <span className="inline-block w-8" />}
          </div>
        </header>

        {/* Page content */}
        <div className="mt-8 flex flex-1 flex-col">
          {children}
        </div>
      </div>
    </main>
  )
}
