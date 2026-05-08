import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { AxiosError } from "axios"
import { ChevronLeft, LockKeyhole } from "lucide-react"
import { toast } from "sonner"

import { PinEntrySlide } from "@/components/pin-entry-slide"
import { PinInfo } from "@/components/pin-info"
import { Button } from "@/components/ui/button"
import {
  useCheckPin,
  usePinPresenceQuery,
  usePrefetchPinPresence,
  useResetPin,
} from "@/hooks/use-change-pin"
import { pinSchema } from "@/lib/schemas/auth"

type ChangePinStep = "intro" | "current" | "new"

const PIN_LENGTH = 4

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

export function ChangePinPage() {
  const navigate = useNavigate()
  const prefetchPinPresence = usePrefetchPinPresence()
  const { data: pinPresence } = usePinPresenceQuery()
  const checkPinMutation = useCheckPin()
  const resetPinMutation = useResetPin()

  const [step, setStep] = useState<ChangePinStep>("intro")
  const [currentPin, setCurrentPin] = useState("")
  const [newPin, setNewPin] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  const isPending =
    checkPinMutation.isPending || resetPinMutation.isPending

  const buttonLabel = useMemo(() => {
    if (step === "intro") {
      return "Proceed to change your PIN"
    }

    if (step === "current") {
      return checkPinMutation.isPending ? "Checking PIN..." : "Continue"
    }

    return resetPinMutation.isPending ? "Saving new PIN..." : "Continue"
  }, [checkPinMutation.isPending, resetPinMutation.isPending, step])

  const isButtonDisabled = useMemo(() => {
    if (isPending) {
      return true
    }

    if (step === "intro") {
      return false
    }

    if (step === "current") {
      return currentPin.length !== PIN_LENGTH
    }

    return newPin.length !== PIN_LENGTH
  }, [currentPin.length, isPending, newPin.length, step])

  const handleBack = () => {
    if (step === "intro") {
      setErrorMessage("")
      navigate("/more")
      return
    }

    if (step === "current") {
      setErrorMessage("")
      setCurrentPin("")
      setStep("intro")
      return
    }

    setErrorMessage("")
    setNewPin("")
    if (pinPresence?.has_pin) {
      setStep("current")
      return
    }

    setStep("intro")
  }

  const handleContinue = async () => {
    if (step === "intro") {
      setErrorMessage("")
      try {
        const prefetched = await prefetchPinPresence()
        const hasPin = prefetched?.has_pin ?? pinPresence?.has_pin ?? false
        setStep(hasPin ? "current" : "new")
      } catch (error) {
        setErrorMessage(getErrorMessage(error, "Unable to check PIN status. Please try again."))
      }
      return
    }

    if (step === "current") {
      try {
        await checkPinMutation.mutateAsync(currentPin)
        setStep("new")
      } catch (error) {
        setErrorMessage(getErrorMessage(error, "We could not verify that PIN. Please try again."))
      }
      return
    }

    if (newPin === currentPin && pinPresence?.has_pin) {
      setErrorMessage("New PIN must be different from your current PIN.")
      return
    }

    const validationResult = pinSchema.safeParse(newPin)
    if (!validationResult.success) {
      setErrorMessage(validationResult.error.issues[0]?.message ?? "Invalid PIN.")
      return
    }

    try {
      await resetPinMutation.mutateAsync(newPin)
      toast.success("PIN changed successfully.")
      navigate("/more", { replace: true })
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "We could not update your PIN. Please try again."))
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
          {step === "intro" ? <PinInfo /> : null}
          {step === "current" ? (
            <PinEntrySlide
              icon={<LockKeyhole className="size-12" strokeWidth={1.8} />}
              title="Enter your current PIN"
              description="Enter your existing 4-digit code"
              value={currentPin}
              onChange={(value) => {
                setErrorMessage("")
                setCurrentPin(value)
              }}
              error={errorMessage}
            />
          ) : null}
          {step === "new" ? (
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
          ) : null}
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
