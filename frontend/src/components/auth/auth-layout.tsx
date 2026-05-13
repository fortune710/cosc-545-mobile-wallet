import type { ReactNode } from 'react'
import { SecureWalletLogo } from '@/components/brand/securewallet-logo'

const quote = {
  text: 'Send money with total confidence.',
  sub: 'AuraPay protects every transaction with verified identity, real-time security checks, and zero guesswork.',
}

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-svh bg-white dark:bg-zinc-950 md:grid md:grid-cols-[1fr_1fr] lg:grid-cols-[480px_1fr]">

      {/* Left brand panel — desktop only */}
      <aside
        className="relative hidden overflow-hidden px-10 py-12 text-white md:flex md:flex-col md:justify-between"
        style={{
          background:
            'radial-gradient(circle at top left, rgba(167,139,250,0.15) 0%, transparent 26%), linear-gradient(140deg, #2d1b69 0%, #4c1d95 44%, #5b21b6 100%)',
        }}
      >
        {/* Background orbs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 left-10 h-64 w-64 rounded-full bg-violet-400/15 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-purple-500/15 blur-3xl" />
          <div className="absolute top-1/2 left-1/3 h-48 w-48 -translate-y-1/2 rounded-full bg-indigo-400/10 blur-3xl" />
          <div className="absolute inset-y-10 right-12 w-px bg-white/10" />
        </div>

        {/* Brand */}
        <div className="relative">
          <SecureWalletLogo light />
        </div>

        {/* Quote */}
        <div className="relative">
          <p className="max-w-md text-4xl font-black leading-[0.95] tracking-[-0.05em] lg:text-5xl">
            {quote.text}
          </p>
          <p className="mt-5 max-w-md text-[17px] leading-relaxed text-violet-200/82">
            {quote.sub}
          </p>

          {/* Feature chips */}
          <div className="mt-10 flex flex-wrap gap-2.5">
            {['Instant transfers', 'Verified identity', 'MFA by default', 'Bank-grade security'].map((f) => (
              <span
                key={f}
                className="rounded-full border border-violet-300/20 bg-white/8 px-3.5 py-1.5 text-[13px] font-medium text-white/86 backdrop-blur-sm"
              >
                {f}
              </span>
            ))}
          </div>

          <div className="mt-12 rounded-[28px] border border-violet-300/15 bg-white/6 p-5 backdrop-blur-sm">
            <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-violet-200/70">
              Why people trust it
            </p>
            <div className="mt-4 grid gap-3 text-sm text-violet-100/88">
              <p>Your balance is always accurate, instant, and protected.</p>
              <p>Every sign-in and payment is verified with multi-factor security.</p>
              <p>Simple, fast, and secure — from your first transfer to your last.</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative text-[13px] text-violet-200/56">
          Secure transfers, verified identity, protected money.
        </div>
      </aside>

      {/* Right form panel */}
      <main className="flex min-h-svh flex-col md:min-h-0 md:overflow-y-auto">
        {/* Mobile-only branded header — gives all auth screens a consistent anchor on small screens */}
        <div className="flex items-center px-6 pt-8 pb-2 md:hidden">
          <SecureWalletLogo compact />
        </div>

        {children}
      </main>
    </div>
  )
}
