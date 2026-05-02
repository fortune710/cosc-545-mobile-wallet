import { useMemo, useState } from "react"
import { ArrowLeft, CheckCircle2, Mail, UserRound } from "lucide-react"
import { Link } from "react-router-dom"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AmountDisplay } from "./amount-display"

type Recipient = {
  id: string
  name: string
  email: string
}

const mockRecipients: Recipient[] = [
  { id: "r1", name: "Jordan Miles", email: "jordan@example.com" },
  { id: "r2", name: "Luna Carter", email: "luna@example.com" },
  { id: "r3", name: "Sam Rivera", email: "sam@example.com" },
  { id: "r4", name: "Taylor Brooks", email: "taylor@example.com" },
]

const quickAmounts = [25, 50, 100, 250]
type Step = 1 | 2 | 3

function formatAmount(value: number, withCents = false) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: withCents ? 2 : 0,
    maximumFractionDigits: withCents ? 2 : 2,
  }).format(value)
}

export function TransferFlow({
  mode,
}: {
  mode: "send" | "receive"
}) {
  const [step, setStep] = useState<Step>(1)
  const [emailInput, setEmailInput] = useState("")
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null)
  const [amount, setAmount] = useState(50)

  const actionLabel = mode === "send" ? "Send" : "Request"
  const actionPast = mode === "send" ? "sent" : "requested"
  const title = mode === "send" ? "Send money" : "Request money"

  const filteredRecipients = useMemo(() => {
    const query = emailInput.trim().toLowerCase()
    if (!query) return mockRecipients
    return mockRecipients.filter(
      (recipient) =>
        recipient.email.toLowerCase().includes(query) ||
        recipient.name.toLowerCase().includes(query)
    )
  }, [emailInput])

  function goToAmountStep(recipient: Recipient) {
    setSelectedRecipient(recipient)
    setEmailInput(recipient.email)
    setStep(2)
  }

  function useNewEmailRecipient() {
    const email = emailInput.trim()
    if (!email.includes("@")) return
    goToAmountStep({
      id: "new",
      name: email.split("@")[0],
      email,
    })
  }



  function openConfirmStep() {
    if (selectedRecipient && amount > 0) {
      setStep(3)
    }
  }

  function completeAction() {
    const amountLabel = formatAmount(amount, true)
    toast.success(
      `${amountLabel} ${actionPast} ${mode === "send" ? "to" : "from"} ${selectedRecipient?.name}`
    )

    setStep(1)
    setSelectedRecipient(null)
    setEmailInput("")
    setAmount(50)
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-[920px] flex-col box-border bg-white px-4 pt-8 pb-7 sm:px-5 md:px-8 md:pt-10">
      <header className="grid grid-cols-[44px_1fr_44px] items-center">
        <Link
          to="/home"
          className="grid size-11 place-items-center rounded-full text-zinc-900 hover:bg-zinc-100"
          aria-label="Back to home"
        >
          <ArrowLeft className="size-8" />
        </Link>
        <h1 className="text-center text-[44px] font-medium tracking-[-0.03em] text-zinc-950 md:text-[48px]">
          {title}
        </h1>
        <span />
      </header>

      <section className="mx-auto mt-8 w-full max-w-[700px]">
        {step === 2 ? (
          <>
            <div className="relative text-center">
              <p className="text-[16px] font-medium text-zinc-500">Amount</p>
              <AmountDisplay 
                amount={amount} 
                onAmountChange={setAmount} 
                quickAmounts={quickAmounts} 
              />
            </div>

            {selectedRecipient ? (
              <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">Recipient</p>
                <p className="mt-1 text-[18px] font-semibold text-zinc-950">{selectedRecipient.name}</p>
                <p className="text-[14px] text-zinc-500">{selectedRecipient.email}</p>
              </div>
            ) : null}
          </>
        ) : null}

        {step === 1 ? (
          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-[15px] font-medium text-zinc-700">Recipient email</span>
              <div className="relative">
                <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  type="email"
                  placeholder="name@example.com"
                  value={emailInput}
                  onChange={(event) => setEmailInput(event.target.value)}
                  className="h-12 rounded-xl border-zinc-300 bg-zinc-50 pl-10"
                />
              </div>
            </label>

            {emailInput.trim() && !mockRecipients.some((r) => r.email === emailInput.trim()) ? (
              <button
                type="button"
                onClick={useNewEmailRecipient}
                className="w-full rounded-xl border border-lime-300 bg-lime-50 px-4 py-3 text-left text-[15px] font-medium text-lime-900 transition hover:bg-lime-100"
              >
                Use {emailInput.trim()} as a new recipient
              </button>
            ) : null}

            <div>
              <h2 className="mb-2 text-[15px] font-semibold text-zinc-800">Saved recipients</h2>
              <div className="space-y-2">
                {filteredRecipients.map((recipient) => (
                  <button
                    key={recipient.id}
                    type="button"
                    onClick={() => goToAmountStep(recipient)}
                    className="flex w-full items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-left transition hover:bg-zinc-100"
                  >
                    <span className="grid size-9 place-items-center rounded-full bg-violet-100 text-violet-700">
                      <UserRound className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-medium text-zinc-900">
                        {recipient.name}
                      </span>
                      <span className="block truncate text-[13px] text-zinc-500">
                        {recipient.email}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {step === 3 && selectedRecipient ? (
          <div className="mt-12 space-y-6 rounded-3xl border border-zinc-200 bg-zinc-50 p-6">
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-lime-100 text-lime-700">
              <CheckCircle2 className="size-7" />
            </div>
            <div className="text-center">
              <p className="text-sm uppercase tracking-[0.08em] text-zinc-500">
                Confirm {actionLabel.toLowerCase()}
              </p>
              <p className="mt-1 text-[46px] font-semibold tracking-[-0.05em] text-zinc-950">
                {formatAmount(amount, true)}
              </p>
              <p className="text-[15px] text-zinc-600">
                {mode === "send" ? "to" : "from"} {selectedRecipient.name} ({selectedRecipient.email})
              </p>
            </div>
          </div>
        ) : null}
      </section>

      <div className="mx-auto mt-auto w-full max-w-[700px] pt-8">
        {step === 1 ? (
          <Button disabled={!selectedRecipient} onClick={() => setStep(2)} className="h-14 w-full rounded-full text-[18px] font-semibold">
            Continue
          </Button>
        ) : null}

        {step === 2 ? (
          <div className="space-y-2">
            <Button onClick={openConfirmStep} className="h-14 w-full rounded-full text-[18px] font-semibold">
              Continue
            </Button>
            <Button variant="outline" onClick={() => setStep(1)} className="h-12 w-full rounded-full">
              Back
            </Button>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-2">
            <Button onClick={completeAction} className="h-14 w-full rounded-full text-[18px] font-semibold">
              {actionLabel} now
            </Button>
            <Button variant="outline" onClick={() => setStep(2)} className="h-12 w-full rounded-full">
              Back
            </Button>
          </div>
        ) : null}
      </div>
    </main>
  )
}
