import { useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { AxiosError } from "axios"
import { ChevronLeft, LockKeyhole } from "lucide-react"
import { toast } from "sonner"

import { PinEntrySlide } from "@/components/pin-entry-slide"
import { Button } from "@/components/ui/button"
import { useResetPin } from "@/hooks/use-change-pin"
import { pinSchema } from "@/lib/schemas/auth"
import { config } from "@/lib/app-config"


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

function getSafeReturnTo(rawValue: string | null) {
  if (!rawValue) {
    return "/home"
  }

  if (!rawValue.startsWith("/")) {
    return "/home"
  }

  if (rawValue.startsWith("//")) {
    return "/home"
  }

  return rawValue
}

export function SetPinPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const resetPinMutation = useResetPin()
  const returnTo = getSafeReturnTo(searchParams.get("returnTo"))

  const [newPin, setNewPin] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  const buttonLabel = useMemo(
    () => (resetPinMutation.isPending ? "Saving PIN..." : "Continue"),
    [resetPinMutation.isPending]
  )

  const isButtonDisabled = useMemo(
    () => resetPinMutation.isPending || newPin.length !== config.pinLength,
    [newPin.length, resetPinMutation.isPending]
  )

  const handleBack = () => {
    navigate("/login", { replace: true })
  }

  const handleContinue = async () => {
    const validationResult = pinSchema.safeParse(newPin)
    if (!validationResult.success) {
      setErrorMessage(validationResult.error.issues[0]?.message ?? "Invalid PIN.")
      return
    }

    try {
      await resetPinMutation.mutateAsync(newPin)
      toast.success("PIN set successfully.")
      navigate(returnTo, { replace: true })
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "We could not set your PIN. Please try again."))
    }
  }

  return (
    <main className="min-h-svh bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] text-slate-950">
      <div className="mx-auto flex min-h-svh w-full max-w-md flex-col px-6 pb-8 pt-6">
        <header className="flex items-center justify-between">
          <Button
            type="button"
            size="icon-lg"
            variant="ghost"
            onClick={handleBack}
            className="size-14 rounded-full border border-white/70 bg-white/90 text-slate-950 shadow-[0_18px_36px_rgba(15,23,42,0.08)] backdrop-blur"
            aria-label="Go back"
          >
            <ChevronLeft className="size-8" strokeWidth={1.8} />
          </Button>
        </header>

        <div className="flex flex-1 flex-col justify-center py-6">
          <PinEntrySlide
            icon={<LockKeyhole className="size-12" strokeWidth={1.8} />}
            title="Create a new PIN"
            description="Enter a 4-digit code you won't forget"
            value={newPin}
            onChange={(value) => {
              setErrorMessage("")
              setNewPin(value)
            }}
            error={errorMessage}
          />
        </div>

        <footer className="pt-6">
          <Button
            type="button"
            onClick={handleContinue}
            disabled={isButtonDisabled}
            className="h-16 w-full rounded-[1.2rem] bg-[#2F6AE8] text-lg font-semibold text-white shadow-[0_18px_40px_rgba(47,106,232,0.28)] transition-transform duration-200 hover:bg-[#275fd1] active:scale-[0.99] disabled:bg-[#DDE4F3] disabled:text-[#97A3BE] disabled:shadow-none"
          >
            {buttonLabel}
          </Button>
        </footer>
      </div>
    </main>
  )
}
