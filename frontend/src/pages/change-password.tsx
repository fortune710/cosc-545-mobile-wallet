import { useMemo, useState, type FormEvent } from 'react'
import { AxiosError } from 'axios'
import { IconAlertTriangle, IconEye, IconEyeOff } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { SettingsLayout } from '@/components/layout/settings-layout'
import { useChangePassword } from '@/hooks/use-change-password'

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/
const passwordHelpText = 'Use 12+ characters with upper and lower case, a number, and a special character.'

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof AxiosError) {
    const detail = error.response?.data?.detail
    if (typeof detail === 'string' && detail.length > 0) return detail
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}

export function ChangePasswordPage() {
  const navigate = useNavigate()
  const changePasswordMutation = useChangePassword()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const currentPasswordIsValid = currentPassword.trim().length >= 12
  const newPasswordIsValid = passwordRegex.test(newPassword.trim())
  const passwordsMatch = currentPassword === newPassword
  const formIsValid = currentPasswordIsValid && newPasswordIsValid && !passwordsMatch
  const canSubmit = formIsValid && !changePasswordMutation.isPending

  const submitLabel = useMemo(
    () => (changePasswordMutation.isPending ? 'Updating…' : 'Update Password'),
    [changePasswordMutation.isPending],
  )

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit) {
      if (passwordsMatch) setErrorMessage('New password must differ from the current password.')
      else setErrorMessage(passwordHelpText)
      return
    }

    setErrorMessage('')
    try {
      await changePasswordMutation.mutateAsync({ currentPassword, newPassword })
      toast.success('Password updated successfully.')
      navigate('/more', { replace: true })
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Could not update your password. Please try again.'))
    }
  }

  return (
    <SettingsLayout title="Change password">
      <p className="text-[14px] text-zinc-500 dark:text-zinc-400">
        Choose a strong, unique password for your account.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
        {/* Current password */}
        <div>
          <Label htmlFor="currentPassword" className="mb-1.5 block text-[13px] font-semibold text-zinc-700 dark:text-zinc-300">
            Current password
          </Label>
          <div className="relative">
            <Input
              id="currentPassword"
              type={showCurrent ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => { setErrorMessage(''); setCurrentPassword(e.target.value) }}
              autoComplete="current-password"
              className="h-11 rounded-xl border border-zinc-200 bg-zinc-50 pr-11 text-[15px] text-zinc-900 placeholder:text-zinc-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-white dark:focus:border-violet-600 dark:focus:bg-zinc-800"
              placeholder="Current password"
            />
            <button type="button" onClick={() => setShowCurrent((p) => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors" aria-label="Toggle visibility">
              {showCurrent ? <IconEyeOff size={18} /> : <IconEye size={18} />}
            </button>
          </div>
          {currentPassword.length > 0 && !currentPasswordIsValid && (
            <p className="mt-1.5 text-[12px] text-red-500">Password must be at least 12 characters.</p>
          )}
        </div>

        {/* New password */}
        <div>
          <Label htmlFor="newPassword" className="mb-1.5 block text-[13px] font-semibold text-zinc-700 dark:text-zinc-300">
            New password
          </Label>
          <div className="relative">
            <Input
              id="newPassword"
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => { setErrorMessage(''); setNewPassword(e.target.value) }}
              autoComplete="new-password"
              className="h-11 rounded-xl border border-zinc-200 bg-zinc-50 pr-11 text-[15px] text-zinc-900 placeholder:text-zinc-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-white dark:focus:border-violet-600 dark:focus:bg-zinc-800"
              placeholder="New password"
            />
            <button type="button" onClick={() => setShowNew((p) => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors" aria-label="Toggle visibility">
              {showNew ? <IconEyeOff size={18} /> : <IconEye size={18} />}
            </button>
          </div>
          {newPassword.length > 0 && !newPasswordIsValid && (
            <p className="mt-1.5 text-[12px] text-red-500">{passwordHelpText}</p>
          )}
          {newPassword.length > 0 && newPasswordIsValid && passwordsMatch && (
            <p className="mt-1.5 text-[12px] text-red-500">New password must differ from current.</p>
          )}
        </div>

        {errorMessage && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
            <IconAlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <Button
          type="submit"
          disabled={!canSubmit}
          className="h-11 w-full rounded-xl bg-violet-600 text-[15px] font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
        >
          {submitLabel}
        </Button>
      </form>
    </SettingsLayout>
  )
}
