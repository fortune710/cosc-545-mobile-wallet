import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { AxiosError } from "axios"
import { LockKeyhole } from "lucide-react"
import { toast } from "sonner"

import { PinEntrySlide } from "@/components/pin-entry-slide"
import { PinInfo } from "@/components/pin-info"
import { Button } from "@/components/ui/button"
import { SettingsLayout } from "@/components/layout/settings-layout"
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
    if (typeof detail === "string" && detail.length > 0) return detail
  }
  if (error instanceof Error && error.message) return error.message
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

  const isPending = checkPinMutation.isPending || resetPinMutation.isPending

  const pageTitle = useMemo(() => {
    if (step === "current") return "Enter current PIN"
    if (step === "new") return "Create new PIN"
    return "Change PIN"
  }, [step])

  const buttonLabel = useMemo(() => {
    if (step === "intro") return "Proceed to change your PIN"
    if (step === "current") return checkPinMutation.isPending ? "Checking PIN..." : "Continue"
    return resetPinMutation.isPending ? "Saving new PIN..." : "Continue"
  }, [checkPinMutation.isPending, resetPinMutation.isPending, step])

  const isButtonDisabled = useMemo(() => {
    if (isPending) return true
    if (step === "intro") return false
    if (step === "current") return currentPin.length !== PIN_LENGTH
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
    setStep(pinPresence?.has_pin ? "current" : "intro")
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
    <SettingsLayout title={pageTitle} onBack={handleBack}>
      <div className="flex flex-1 flex-col justify-center py-4">
        {step === "intro" && <PinInfo />}
        {step === "current" && (
          <PinEntrySlide
            icon={<LockKeyhole className="size-12" strokeWidth={1.8} />}
            title="Enter your current PIN"
            description="Enter your existing 4-digit code"
            value={currentPin}
            onChange={(value) => { setErrorMessage(""); setCurrentPin(value) }}
            error={errorMessage}
          />
        )}
        {step === "new" && (
          <PinEntrySlide
            icon={<LockKeyhole className="size-12" strokeWidth={1.8} />}
            title="Create a new PIN"
            description="Enter a 4-digit code you won't forget"
            value={newPin}
            onChange={(value) => { setErrorMessage(""); setNewPin(value) }}
            error={errorMessage}
          />
        )}
      </div>

      <div className="pt-4">
        <Button
          type="button"
          onClick={handleContinue}
          disabled={isButtonDisabled}
          className="h-14 w-full rounded-2xl bg-violet-600 text-[17px] font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:bg-violet-700 active:scale-[0.99] disabled:opacity-50 disabled:shadow-none"
        >
          {buttonLabel}
        </Button>
      </div>
    </SettingsLayout>
  )
}
