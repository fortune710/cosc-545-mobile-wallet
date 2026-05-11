import type { ReactNode } from "react"
import { Delete } from "lucide-react"

import { cn } from "@/lib/utils"

const KEYPAD_VALUES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "backspace"] as const

type PinEntrySlideProps = {
  icon: ReactNode
  title: string
  description: string
  value: string
  onChange: (value: string) => void
  error: string
  length?: number
  masked?: boolean
}

function PinSlots({ value, length = 4, masked = true }: { value: string; length?: number; masked?: boolean }) {
  const compact = length > 4
  const activeIndex = value.length < length ? value.length : length - 1
  const isComplete = value.length >= length

  return (
    <div className="mt-4 flex items-center justify-center gap-2">
      {Array.from({ length }).map((_, index) => {
        const isFilled = index < value.length
        const isActive = !isComplete && index === activeIndex

        return (
          <div
            key={index}
            className={cn(
              "grid place-items-center rounded-lg border font-semibold transition-all duration-150",
              compact ? "size-[2.8rem] text-[1.4rem]" : "size-16 text-[1.8rem]",
              isFilled
                ? "border-[#2F6AE8] bg-[#EEF4FF] text-[#2F6AE8] shadow-[0_4px_12px_rgba(47,106,232,0.15)]"
                : isActive
                  ? "border-[#2F6AE8] bg-white text-slate-900 shadow-[0_0_0_3px_rgba(47,106,232,0.15)]"
                  : "border-slate-200 bg-white text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
            )}
          >
            {isFilled ? (masked ? "•" : value[index]) : ""}
          </div>
        )
      })}
    </div>
  )
}

export function PinEntrySlide({
  icon,
  title,
  description,
  value,
  onChange,
  error,
  length = 4,
  masked = true,
}: PinEntrySlideProps) {
  const handleDigitClick = (digit: string) => {
    if (value.length >= length) {
      return
    }
    onChange(`${value}${digit}`)
  }

  const handleBackspace = () => {
    if (value.length === 0) {
      return
    }
    onChange(value.slice(0, -1))
  }

  return (
    <section className="flex flex-col items-center text-center">
      <div className="mt-4 grid size-16 place-items-center rounded-3xl bg-[linear-gradient(180deg,#EEF4FF_0%,#E8EEFF_100%)] text-[#2F6AE8] shadow-[0_20px_40px_rgba(47,106,232,0.12)]">
        {icon}
      </div>
      <h1 className="mt-4 max-w-85 text-[2.5rem] font-semibold leading-[0.98] tracking-[-0.08em] text-slate-950">
        {title}
      </h1>
      <p className="mt-2 max-w-[240px] text-[0.95rem] leading-6 text-slate-500">
        {description}
      </p>

      <PinSlots value={value} length={length} masked={masked} />

      <div className="mt-3 min-h-5">
        {error ? <p className="text-sm font-medium text-red-500">{error}</p> : null}
      </div>

      <div className="mt-3 grid w-full grid-cols-3 gap-y-2">
        {KEYPAD_VALUES.map((keyValue, index) => {
          if (!keyValue) {
            return <div key={`empty-${index}`} />
          }

          if (keyValue === "backspace") {
            return (
              <button
                key={keyValue}
                type="button"
                onClick={handleBackspace}
                aria-label="Delete last digit"
                className="mx-auto grid size-16 place-items-center rounded-full text-red-500 transition-colors hover:bg-red-50 active:scale-[0.98]"
              >
                <Delete className="size-8" strokeWidth={2.2} />
              </button>
            )
          }

          return (
            <button
              key={keyValue}
              type="button"
              onClick={() => handleDigitClick(keyValue)}
              className={cn(
                "mx-auto grid size-16 place-items-center rounded-full text-[2.5rem] font-medium leading-none text-slate-800 transition-colors active:scale-[0.98]",
                value.length >= length ? "opacity-50" : "hover:bg-slate-100"
              )}
            >
              {keyValue}
            </button>
          )
        })}
      </div>
    </section>
  )
}

