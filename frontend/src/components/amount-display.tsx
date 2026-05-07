import { useState } from "react"
import { Pencil } from "lucide-react"
import { toast } from "sonner"

import { Input } from "@/components/ui/input"
import { config } from "@/lib/app-config"

interface AmountDisplayProps {
  amount: number
  onAmountChange: (amount: number) => void
  quickAmounts?: number[]
}

export function AmountDisplay({
  amount,
  onAmountChange,
  quickAmounts = [10, 20, 30, 50],
}: AmountDisplayProps) {
  const [isEditingAmount, setIsEditingAmount] = useState(false)
  const [amountInput, setAmountInput] = useState(String(amount))

  function formatAmount(value: number) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value)
  }

  function commitAmount() {
    const parsed = Number(amountInput)
    if (!Number.isNaN(parsed) && parsed > 0) {
      if (parsed > config.maxPaymentAmount) {
        toast.error(`Maximum amount is $${config.maxPaymentAmount}`)
        setAmountInput(String(config.maxPaymentAmount))
        // Keep editing mode open so user can correct
        return
      } else {
        onAmountChange(parsed)
      }
    } else {
      setAmountInput(String(amount))
    }
    setIsEditingAmount(false)
  }

  function applyQuickAmount(value: number) {
    if (value > 50) {
      toast.error("Maximum amount is $50")
      // Don't update amount if it's over the limit
      return
    }
    onAmountChange(value)
    setAmountInput(String(value))
    setIsEditingAmount(false)
  }

  return (
    <section className="mt-10">
      <div className="relative mx-auto w-full max-w-[460px] text-center">
        {isEditingAmount ? (
          <div className="flex items-center justify-center">
            <Input
              value={amountInput}
              onChange={(event) => setAmountInput(event.target.value)}
              onBlur={commitAmount}
              onKeyDown={(event) => {
                if (event.key === "Enter") commitAmount()
                if (event.key === "Escape") {
                  setAmountInput(String(amount))
                  setIsEditingAmount(false)
                }
              }}
              autoFocus
              inputMode="decimal"
              className="w-full h-auto p-0 bg-transparent border-0 border-transparent shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 text-center text-[88px] leading-[0.9] font-semibold tracking-[-0.05em] text-zinc-950 md:text-[102px]"
              aria-label="Amount"
            />
          </div>
        ) : (
          <>
            <div className="text-[88px] leading-[0.9] font-semibold tracking-[-0.05em] text-zinc-950 md:text-[102px]">
              {formatAmount(amount)}
            </div>
            <button
              type="button"
              onClick={() => {
                setAmountInput(String(amount))
                setIsEditingAmount(true)
              }}
              aria-label="Edit amount"
              className="absolute top-1/2 right-[18%] -translate-y-1/2 rounded-full p-2 text-zinc-500 transition hover:bg-zinc-200/60 hover:text-zinc-800"
            >
              <Pencil className="size-6" />
            </button>
          </>
        )}
      </div>

      <div className="mt-8 grid grid-cols-4 gap-2">
        {quickAmounts.map((value) => {
          const active = amount === value && !isEditingAmount
          return (
            <button
              key={value}
              type="button"
              onClick={() => applyQuickAmount(value)}
              className={[
                "h-12 rounded-2xl border text-[15px] font-semibold transition sm:h-14 sm:text-[18px]",
                active
                  ? "border-zinc-900 bg-zinc-950 text-white"
                  : "border-zinc-300 bg-transparent text-zinc-900 hover:bg-zinc-100",
              ].join(" ")}
            >
              {formatAmount(value)}
            </button>
          )
        })}
      </div>
    </section>
  )
}
