import { useQuery } from '@tanstack/react-query'
import { Monitor, Smartphone, Globe, Clock } from 'lucide-react'
import { authService } from '@/services/auth-service'
import { SettingsLayout } from '@/components/layout/settings-layout'
import { Skeleton } from '@/components/ui/skeleton'
import { getDeviceFingerprint } from '@/lib/fingerprint'
import { useEffect, useState } from 'react'
import type { SessionRecord } from '@/lib/types'

function parseUserAgent(ua: string): { browser: string; os: string } {
  if (!ua) return { browser: 'Unknown browser', os: 'Unknown OS' }

  let browser = 'Unknown browser'
  if (ua.includes('Edg/')) browser = 'Edge'
  else if (ua.includes('Chrome/') && !ua.includes('Chromium/')) browser = 'Chrome'
  else if (ua.includes('Firefox/')) browser = 'Firefox'
  else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Safari'
  else if (ua.includes('OPR/') || ua.includes('Opera/')) browser = 'Opera'

  let os = 'Unknown OS'
  if (ua.includes('Windows NT')) os = 'Windows'
  else if (ua.includes('Mac OS X')) os = 'macOS'
  else if (ua.includes('Android')) os = 'Android'
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS'
  else if (ua.includes('Linux')) os = 'Linux'

  return { browser, os }
}

function isMobile(ua: string): boolean {
  return /Android|iPhone|iPad|Mobile/i.test(ua)
}

function DeviceIcon({ ua }: { ua: string }) {
  const mobile = isMobile(ua)
  const Icon = mobile ? Smartphone : Monitor
  return <Icon className="size-5 text-violet-500 shrink-0" strokeWidth={1.5} />
}

function SessionCard({ session, isCurrentDevice }: { session: SessionRecord; isCurrentDevice: boolean }) {
  const { browser, os } = parseUserAgent(session.user_agent)
  const createdAt = new Date(session.created_at)
  const formattedDate = createdAt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  const formattedTime = createdAt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })

  return (
    <div className={`flex items-start gap-4 px-4 py-3.5 ${isCurrentDevice ? 'bg-violet-50 dark:bg-violet-950/30' : ''}`}>
      <div className="mt-0.5">
        <DeviceIcon ua={session.user_agent} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100">
            {browser} on {os}
          </span>
          {isCurrentDevice && (
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
              This device
            </span>
          )}
          {!session.is_active && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-400 dark:bg-zinc-800">
              Expired
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[13px] text-zinc-400">
          {session.ip_address && (
            <span className="flex items-center gap-1">
              <Globe className="size-3" />
              {session.ip_address}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="size-3" />
            {formattedDate} at {formattedTime}
          </span>
        </div>
      </div>
    </div>
  )
}

export function SessionsPage() {
  const { data: sessions, isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => authService.getSessions(),
  })

  const [currentDeviceId, setCurrentDeviceId] = useState('')
  useEffect(() => {
    getDeviceFingerprint().then(setCurrentDeviceId)
  }, [])

  const active = sessions?.filter(s => s.is_active) ?? []
  const inactive = sessions?.filter(s => !s.is_active) ?? []

  return (
    <SettingsLayout title="Active Devices" backTo="/more" backLabel="Settings">
      <p className="mb-5 text-[14px] text-zinc-500 dark:text-zinc-400">
        These are the devices that have accessed your AuraPay account. Each sign-in creates a new session entry.
      </p>

      <section className="mb-6">
        <h2 className="text-[12px] font-semibold text-zinc-400 mb-2 px-1 tracking-widest uppercase">
          Active Sessions
        </h2>
        <div className="overflow-hidden rounded-2xl border border-zinc-100 bg-white dark:border-zinc-800 dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
          {isLoading ? (
            <>
              {[0, 1].map(i => (
                <div key={i} className="flex items-start gap-4 px-4 py-3.5">
                  <Skeleton className="size-5 rounded-md mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40 rounded" />
                    <Skeleton className="h-3 w-32 rounded" />
                  </div>
                </div>
              ))}
            </>
          ) : active.length === 0 ? (
            <p className="px-4 py-4 text-[14px] text-zinc-400">No active sessions found.</p>
          ) : (
            active.map(session => (
              <SessionCard
                key={session.session_key}
                session={session}
                isCurrentDevice={!!currentDeviceId && session.device_id === currentDeviceId}
              />
            ))
          )}
        </div>
      </section>

      {!isLoading && inactive.length > 0 && (
        <section className="mb-6">
          <h2 className="text-[12px] font-semibold text-zinc-400 mb-2 px-1 tracking-widest uppercase">
            Past Sessions
          </h2>
          <div className="overflow-hidden rounded-2xl border border-zinc-100 bg-white dark:border-zinc-800 dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
            {inactive.slice(0, 5).map(session => (
              <SessionCard
                key={session.session_key}
                session={session}
                isCurrentDevice={false}
              />
            ))}
          </div>
        </section>
      )}
    </SettingsLayout>
  )
}
