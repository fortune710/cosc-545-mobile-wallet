import { config } from '@/lib/app-config'

type SecureWalletLogoProps = {
  compact?: boolean
  light?: boolean
  className?: string
}

export function SecureWalletLogo({ compact = false, light = false, className = '' }: SecureWalletLogoProps) {
  const wordmarkTone = light ? 'text-white' : 'text-zinc-900 dark:text-white'
  const eyebrowTone = light ? 'text-violet-200/80' : 'text-zinc-500 dark:text-zinc-400'

  return (
    <div className={`flex items-center gap-3 ${className}`.trim()}>
      <svg
        aria-hidden="true"
        viewBox="0 0 56 56"
        className="size-11 shrink-0 drop-shadow-[0_8px_18px_rgba(109,40,217,0.35)]"
      >
        <defs>
          <linearGradient id="sw-panel" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b1278" />
            <stop offset="100%" stopColor="#1e0a47" />
          </linearGradient>
          <linearGradient id="sw-shield" x1="10%" y1="10%" x2="90%" y2="90%">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="50%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#5b21b6" />
          </linearGradient>
          <linearGradient id="sw-coin" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c4b5fd" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>

        {/* Background panel */}
        <rect x="3" y="3" width="50" height="50" rx="15" fill="url(#sw-panel)" />

        {/* Shield shape */}
        <path
          d="M28 10 L38.5 14.5 C39.5 14.9 40 15.8 40 16.8 L40 27.5 C40 33.8 34.8 39.2 28.8 41.5 C28.3 41.7 27.7 41.7 27.2 41.5 C21.2 39.2 16 33.8 16 27.5 L16 16.8 C16 15.8 16.5 14.9 17.5 14.5 Z"
          fill="url(#sw-shield)"
        />

        {/* Wallet slot cut */}
        <rect x="22" y="24.5" width="12" height="4" rx="2" fill="rgba(255,255,255,0.9)" />

        {/* Coin accent */}
        <circle cx="34.5" cy="26.5" r="3.5" fill="url(#sw-coin)" />
        <circle cx="34.5" cy="26.5" r="3.5" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.8" />
      </svg>

      {compact ? (
        <div className="min-w-0">
          <p className={`text-base font-black tracking-[-0.03em] ${wordmarkTone}`}>{config.appName}</p>
        </div>
      ) : (
        <div className="min-w-0">
          <p className={`text-lg font-black tracking-[-0.03em] ${wordmarkTone}`}>{config.appName}</p>
        </div>
      )}
    </div>
  )
}
