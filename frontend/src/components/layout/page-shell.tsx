import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type PageShellProps = {
  children: ReactNode
  className?: string
  maxWidth?: string
}

export function PageShell({ children, className, maxWidth = 'max-w-230' }: PageShellProps) {
  return (
    <main
      className={cn(
        'mx-auto w-full box-border',
        maxWidth,
        'px-4 pt-8 pb-28 sm:px-5 md:px-8 md:pt-10 md:pb-10',
        className,
      )}
    >
      {children}
    </main>
  )
}
