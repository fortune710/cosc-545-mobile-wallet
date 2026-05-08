import { useMemo, useState, type FormEvent } from "react"
import { AxiosError } from "axios"
import { ChevronLeft } from "lucide-react"
import {
  IconAlertTriangle,
  IconEye,
  IconEyeOff,
} from "@tabler/icons-react"
import { useNavigate } from "react-router-dom"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useChangePassword } from "@/hooks/use-change-password"
import { config } from "@/lib/app-config"
import { Button } from "@/components/ui/button"

const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/
const passwordHelpText =
  "Use 12+ characters with upper and lower case letters, a number, and a special character."

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof AxiosError) {
    const detail = error.response?.data?.detail
    if (typeof detail === "string" && detail.length > 0) {
      return detail
    }
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallback
}

function PasswordField({
  id,
  label,
  placeholder,
  value,
  visible,
  onToggleVisible,
  onChange,
  autoComplete,
  error,
}: {
  id: string
  label: string
  placeholder: string
  value: string
  visible: boolean
  onToggleVisible: () => void
  onChange: (value: string) => void
  autoComplete: string
  error?: string
}) {
  return (
    <div>
      <Label
        htmlFor={id}
        className="mb-2 block text-[14px] font-medium text-zinc-700 dark:text-zinc-300"
      >
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          className="h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 pr-12 text-sm outline-none transition-all focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-600 dark:focus:ring-zinc-800/50"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={onToggleVisible}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 transition-colors hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          {visible ? <IconEyeOff size={20} /> : <IconEye size={20} />}
        </button>
      </div>
      {error ? <p className="mt-2 text-xs text-red-500">{error}</p> : null}
    </div>
  )
}

export function ChangePasswordPage() {
  const navigate = useNavigate()
  const changePasswordMutation = useChangePassword()

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  //Change This to use Zod Later, this doesn't cut it
  const currentPasswordIsValid = currentPassword.trim().length >= 12
  const newPasswordIsValid = passwordRegex.test(newPassword.trim())
  const passwordsMatch = currentPassword === newPassword
  const formIsValid =
    currentPasswordIsValid && newPasswordIsValid && !passwordsMatch
  const canSubmit = formIsValid && !changePasswordMutation.isPending

  const submitLabel = useMemo(() => {
    if (changePasswordMutation.isPending) {
      return "Updating Password..."
    }

    return "Change Password"
  }, [changePasswordMutation.isPending])

  const handleBack = () => {
    navigate("/more")
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!canSubmit) {
      if (!currentPasswordIsValid || !newPasswordIsValid) {
        setErrorMessage(passwordHelpText)
        return
      }

      if (passwordsMatch) {
        setErrorMessage("New password must differ from the current password.")
      }

      return
    }

    setErrorMessage("")

    try {
      await changePasswordMutation.mutateAsync({
        currentPassword,
        newPassword,
      })
      navigate("/more", { replace: true })
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, "We could not update your password. Please try again.")
      )
    }
  }

  return (
    <main className="min-h-svh bg-white text-zinc-950">
      <div className="mx-auto flex min-h-svh w-full max-w-md flex-col px-6 pb-8 pt-6">
        <header className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            className="grid size-14 place-items-center rounded-full border border-white/70 bg-white/90 text-slate-950 shadow-[0_18px_36px_rgba(15,23,42,0.08)] backdrop-blur transition-transform hover:scale-[0.98] active:scale-[0.97]"
            aria-label="Go back"
          >
            <ChevronLeft className="size-8" strokeWidth={1.8} />
          </button>
        </header>

        <div className="flex flex-1 flex-col justify-between">
          <section className="mt-6 md:mt-10">
            <div className="grid gap-5">
              <h1 className="text-xl my-0! font-semibold leading-[0.95] tracking-[-0.05em] text-zinc-950">
                Change Password
              </h1>
              <p className="text-lg leading-tight text-zinc-500">
                Change your password to a new one.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-10 md:mt-14 space-y-6" noValidate>
              <PasswordField
                id="currentPassword"
                label="Current Password"
                placeholder="Current Password"
                value={currentPassword}
                visible={showCurrentPassword}
                onToggleVisible={() => setShowCurrentPassword((prev) => !prev)}
                onChange={(value) => {
                  setErrorMessage("")
                  setCurrentPassword(value)
                }}
                autoComplete="current-password"
                error={
                  currentPassword.length > 0 && !currentPasswordIsValid
                    ? "Password must be at least 12 characters."
                    : undefined
                }
              />

              <PasswordField
                id="newPassword"
                label="New Password"
                placeholder="New Password"
                value={newPassword}
                visible={showNewPassword}
                onToggleVisible={() => setShowNewPassword((prev) => !prev)}
                onChange={(value) => {
                  setErrorMessage("")
                  setNewPassword(value)
                }}
                autoComplete="new-password"
                error={
                  newPassword.length > 0 && !newPasswordIsValid
                    ? passwordHelpText
                    : passwordsMatch && newPassword.length > 0
                      ? "New password must differ from the current password."
                      : undefined
                }
              />

              {errorMessage ? (
                <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                  <IconAlertTriangle size={18} />
                  <span>{errorMessage}</span>
                </div>
              ) : null}

              <Button
                type="submit"
                disabled={!canSubmit}
                className="h-14 mt-6 w-full rounded-full bg-[#2F6AE8] text-lg font-semibold text-white shadow-[0_18px_40px_rgba(47,106,232,0.28)] transition-transform duration-200 hover:bg-[#275fd1] active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-[#DDE4F3] disabled:text-[#97A3BE] disabled:shadow-none"
              >
                {submitLabel}
              </Button>
            </form>
          </section>

          <footer className="pt-8">
            <p className="text-center text-[14px] text-zinc-400">
              Protected by your {config.appName} account.
            </p>
          </footer>
        </div>
      </div>
    </main>
  )
}
